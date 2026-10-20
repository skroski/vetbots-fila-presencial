// Ajustes protegidos por ADMIN_PIN (arquivo separado: a variável é lida na inicialização).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'fila-pin-'));
process.env.DATA_DIR = dir;
process.env.ADMIN_PIN = '4321';

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

const chamar = (method, path, body, pin) =>
  fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(pin ? { 'x-admin-pin': pin } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

test('Ajustes exigem PIN; a operação da fila continua livre', async () => {
  assert.equal((await (await chamar('GET', '/api/auth')).json()).pinRequired, true);
  assert.equal((await chamar('PUT', '/api/config', { clinic_name: 'X' })).status, 401);
  assert.equal((await chamar('PUT', '/api/config', { clinic_name: 'X' }, '0000')).status, 401);
  assert.equal((await chamar('PUT', '/api/config', { clinic_name: 'Clínica Y' }, '4321')).status, 200);
  assert.equal((await chamar('POST', '/api/salas', { nome: 'Nova' })).status, 401);
  assert.equal((await chamar('GET', '/api/backup')).status, 401);
  assert.equal((await fetch(`${base}/api/midias?nome=a.mp4`, { method: 'PUT', body: 'x' })).status, 401);

  const { servicos } = await (await chamar('GET', '/api/state')).json();
  assert.equal((await chamar('POST', '/api/itens', { servicoId: servicos[0].id, tutorNome: 'Livre' })).status, 201);
});

test('verificação de PIN limita tentativas erradas', async () => {
  assert.equal((await chamar('POST', '/api/auth/verificar', { pin: '4321' })).status, 200);
  for (let i = 0; i < 5; i++) assert.equal((await chamar('POST', '/api/auth/verificar', { pin: 'errado' })).status, 401);
  assert.equal((await chamar('POST', '/api/auth/verificar', { pin: 'errado' })).status, 429);
});
