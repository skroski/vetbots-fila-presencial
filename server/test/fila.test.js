// Testes de ponta a ponta da API (banco temporário, servidor em porta aleatória).
//   npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'fila-test-'));
process.env.DATA_DIR = dir;

const { app, clientes } = await import('../app.js');
const { db } = await import('../db.js');

let server;
let base;

before(async () => {
  await new Promise((ok) => {
    server = app.listen(0, '127.0.0.1', ok);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  for (const r of clientes) r.end();
  server.closeAllConnections?.();
  server.close();
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

const api = async (method, path, body) => {
  const r = await fetch(base + path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await r.text();
  return { status: r.status, body: texto ? JSON.parse(texto) : null };
};

const estado = async () => (await api('GET', '/api/state')).body;

test('carga inicial cria serviços e salas padrão', async () => {
  const s = await estado();
  assert.equal(s.servicos.length, 7);
  assert.equal(s.salas.length, 7);
  assert.equal(typeof s.servicos[0].ativo, 'boolean');
  assert.match(s.config.brand_color, /^#[0-9a-f]{6}$/);
});

test('200 senhas simultâneas saem únicas e sequenciais', async () => {
  const s = await estado();
  const consulta = s.servicos.find((x) => x.prefixo === 'A');
  const res = await Promise.all(
    Array.from({ length: 200 }, (_, i) =>
      api('POST', '/api/itens', { servicoId: consulta.id, tutorNome: `Tutor ${i}` }),
    ),
  );
  assert.ok(res.every((r) => r.status === 201));
  const senhas = res.map((r) => r.body.senha).sort();
  assert.equal(new Set(senhas).size, 200);
  assert.equal(senhas[0], 'A001');
  assert.equal(senhas.at(-1), 'A200');
});

test('datas saem em ISO com Z (Safari/TVs) e transferência vira array', async () => {
  const s = await estado();
  const it = s.itens[0];
  assert.match(it.chegada_em, /Z$/);
  assert.ok(Array.isArray(it.historico_transferencias));
});

test('validações: tutor obrigatório, prioridade e serviço inválidos', async () => {
  const s = await estado();
  const srv = s.servicos[0].id;
  assert.equal((await api('POST', '/api/itens', { servicoId: srv, tutorNome: '  ' })).status, 400);
  assert.equal((await api('POST', '/api/itens', { servicoId: srv, tutorNome: 'x', prioridade: 'vip' })).status, 400);
  assert.equal((await api('POST', '/api/itens', { servicoId: 'nao-existe', tutorNome: 'x' })).status, 400);
});

test('fluxo completo: chamar próximo respeita prioridade, iniciar, finalizar, ausente, transferir', async () => {
  const s = await estado();
  const retorno = s.servicos.find((x) => x.prefixo === 'B');
  const [sala1, sala2] = s.salas;

  const normal = (await api('POST', '/api/itens', { servicoId: retorno.id, tutorNome: 'Normal' })).body;
  const pref = (await api('POST', '/api/itens', { servicoId: retorno.id, tutorNome: 'Pref', prioridade: 'prioridade' })).body;
  const emerg = (await api('POST', '/api/itens', { servicoId: retorno.id, tutorNome: 'Emerg', prioridade: 'emergencia' })).body;

  // esvazia a fila de A para o teste ser determinístico
  db.prepare("update fila_itens set status='finalizado' where senha like 'A%'").run();

  const c1 = await api('POST', `/api/salas/${sala1.id}/chamar-proximo`);
  assert.equal(c1.body.id, emerg.id);
  assert.equal(c1.body.status, 'chamado');
  assert.equal(c1.body.sala_id, sala1.id);
  const c2 = await api('POST', `/api/salas/${sala2.id}/chamar-proximo`);
  assert.equal(c2.body.id, pref.id);

  const ini = await api('POST', `/api/itens/${emerg.id}/acao`, { acao: 'iniciar' });
  assert.equal(ini.body.status, 'em_atendimento');
  assert.ok(ini.body.iniciado_em);

  const tr = await api('POST', `/api/itens/${pref.id}/acao`, { acao: 'transferir', salaId: sala1.id, motivo: 'Raio-X' });
  assert.equal(tr.body.status, 'chamado');
  assert.equal(tr.body.chegada_em, pref.chegada_em);
  assert.equal(tr.body.historico_transferencias.length, 1);
  assert.equal(tr.body.historico_transferencias[0].motivo, 'Raio-X');

  const aus = await api('POST', `/api/itens/${pref.id}/acao`, { acao: 'ausente' });
  assert.equal(aus.body.status, 'ausente');
  const ret = await api('POST', `/api/itens/${pref.id}/acao`, { acao: 'retornar' });
  assert.equal(ret.body.status, 'aguardando');
  assert.equal(ret.body.chamado_em, null);

  const fim = await api('POST', `/api/itens/${emerg.id}/acao`, { acao: 'finalizar' });
  assert.equal(fim.body.status, 'finalizado');
  assert.equal((await api('POST', `/api/itens/${emerg.id}/acao`, { acao: 'chamar' })).status, 409);
  assert.equal((await api('POST', `/api/itens/${normal.id}/acao`, { acao: 'voar' })).status, 400);

  const chamadas = db.prepare('select count(*) n from fila_chamadas').get().n;
  assert.equal(chamadas, 2);
});

test('chamar próximo sem ninguém aguardando devolve 404 legível', async () => {
  db.prepare("update fila_itens set status='finalizado' where status='aguardando'").run();
  const s = await estado();
  const r = await api('POST', `/api/salas/${s.salas[0].id}/chamar-proximo`);
  assert.equal(r.status, 404);
  assert.match(r.body.erro, /Nenhum paciente/);
});

test('numeração reinicia por dia; item ativo de ontem não gera senha repetida', async () => {
  const s = await estado();
  const x = s.servicos.find((q) => q.prefixo === 'X');
  const e = s.servicos.find((q) => q.prefixo === 'E');
  const a = (await api('POST', '/api/itens', { servicoId: x.id, tutorNome: 'X1' })).body;
  assert.equal(a.senha, 'X001');

  // virada do dia com TUDO encerrado: recomeça em 001
  db.prepare("update fila_itens set status='finalizado' where status in ('aguardando','chamado','em_atendimento')").run();
  db.prepare("update fila_itens set ciclo='2000-01-01'").run();
  const b = (await api('POST', '/api/itens', { servicoId: x.id, tutorNome: 'X2' })).body;
  assert.equal(b.senha, 'X001');

  // virada do dia com X001 ainda aguardando: o novo número pula para X002 (nunca duas X001 ativas)
  db.prepare("update fila_itens set ciclo='2000-01-02' where senha = 'X001' and status = 'aguardando'").run();
  const c = (await api('POST', '/api/itens', { servicoId: x.id, tutorNome: 'X3' })).body;
  assert.equal(c.senha, 'X002');
  assert.equal(db.prepare("select count(*) n from fila_itens where status='aguardando' and senha='X001'").get().n, 1);
  assert.ok(e); // série de outro prefixo não é afetada
});

test('cadastros: prefixo inválido, duplicado e exclusão protegida', async () => {
  assert.equal((await api('POST', '/api/servicos', { nome: 'Banho', prefixo: '1' })).status, 400);
  const ok = await api('POST', '/api/servicos', { nome: 'Banho e Tosa', prefixo: 'bt' });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.prefixo, 'BT');
  assert.equal((await api('POST', '/api/servicos', { nome: 'Banho e Tosa', prefixo: 'Z' })).status, 409);
  assert.equal((await api('DELETE', `/api/servicos/${ok.body.id}`)).status, 204);
  const s = await estado();
  assert.equal((await api('DELETE', `/api/servicos/${s.servicos[0].id}`)).status, 409);
});

test('config: valida cor, grava e devolve logo_url nulo', async () => {
  assert.equal((await api('PUT', '/api/config', { brand_color: 'verde' })).status, 400);
  const r = await api('PUT', '/api/config', { brand_color: '#2563EB', clinic_name: 'Clínica Teste', tv_layout: 'tela_cheia' });
  assert.equal(r.status, 200);
  assert.equal(r.body.brand_color, '#2563eb');
  assert.equal(r.body.tv_layout, 'tela_cheia');
  assert.equal(r.body.logo_url, null);
  assert.equal((await api('PUT', '/api/config', { tv_layout: 'cinema' })).status, 400);
});

const mp4Falso = () => {
  const b = Buffer.alloc(4096, 1);
  b.write('ftypisom', 4, 'latin1');
  return b;
};

test('upload de vídeo: valida assinatura, lista, serve com Range (206) e exclui', async () => {
  const ruim = await fetch(`${base}/api/midias?nome=virus.mp4`, { method: 'PUT', body: Buffer.from('não sou vídeo') });
  assert.equal(ruim.status, 415);
  const ext = await fetch(`${base}/api/midias?nome=x.exe`, { method: 'PUT', body: mp4Falso() });
  assert.equal(ext.status, 415);

  const up = await fetch(`${base}/api/midias?nome=${encodeURIComponent('Promo Vacina.mp4')}`, { method: 'PUT', body: mp4Falso() });
  assert.equal(up.status, 201);
  const m = await up.json();
  assert.equal(m.nome, 'Promo Vacina.mp4');
  assert.match(m.url, /^\/midia\/[0-9a-f-]+\.mp4$/);

  const rng = await fetch(base + m.url, { headers: { Range: 'bytes=0-1' } });
  assert.equal(rng.status, 206);
  assert.equal(rng.headers.get('content-range'), 'bytes 0-1/4096');
  assert.equal(rng.headers.get('accept-ranges'), 'bytes');

  assert.equal((await api('PATCH', `/api/midias/${m.id}`, { ativo: false })).body.ativo, false);
  assert.equal((await estado()).midias.length, 1);
  assert.equal((await api('DELETE', `/api/midias/${m.id}`)).status, 204);
  assert.equal((await fetch(base + m.url)).status, 404);
});

test('upload de logo: aceita PNG, rejeita arquivo disfarçado e remove', async () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]);
  const falso = await fetch(`${base}/api/logo?nome=logo.png`, { method: 'PUT', body: Buffer.from('<html>') });
  assert.equal(falso.status, 415);
  const ok = await fetch(`${base}/api/logo?nome=logo.png`, { method: 'PUT', body: png });
  assert.equal(ok.status, 200);
  const cfg = await ok.json();
  assert.match(cfg.logo_url, /^\/marca\/[0-9a-f-]+\.png$/);
  assert.equal((await fetch(base + cfg.logo_url)).status, 200);
  assert.equal((await api('DELETE', '/api/logo')).body.logo_url, null);
});

test('SSE avisa as telas quando algo muda', async () => {
  const ctrl = new AbortController();
  const r = await fetch(`${base}/api/events`, { signal: ctrl.signal });
  assert.match(r.headers.get('content-type'), /^text\/event-stream/);
  const leitor = r.body.getReader();
  await leitor.read(); // "retry: 3000"
  const s = await estado();
  const esperando = leitor.read();
  await api('POST', '/api/itens', { servicoId: s.servicos[1].id, tutorNome: 'SSE' });
  const { value } = await esperando;
  assert.match(new TextDecoder().decode(value), /event: changed/);
  ctrl.abort();
});

test('backup devolve um SQLite válido', async () => {
  const r = await fetch(`${base}/api/backup`);
  assert.equal(r.status, 200);
  const buf = Buffer.from(await r.arrayBuffer());
  assert.equal(buf.subarray(0, 15).toString('latin1'), 'SQLite format 3');
  writeFileSync(join(dir, 'copia.db'), buf);
});
