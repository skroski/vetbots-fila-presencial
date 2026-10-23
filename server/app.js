// Aplicação Express da Fila Presencial: API + tempo real (SSE) + uploads + interface web.
// (index.js sobe o servidor; os testes importam este arquivo.)
import express from 'express';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { createHash, timingSafeEqual } from 'node:crypto';
import { networkInterfaces, tmpdir } from 'node:os';
import { join } from 'node:path';
import { db, copiarBanco, ROOT, BRAND_DIR, VIDEOS_DIR } from './db.js';
import { lerConfig, validarEGravar } from './config.js';
import { HttpError } from './http-error.js';
import * as fila from './queue.js';
import * as media from './media.js';
import { cssDaCor } from '../shared/cores.js';

export const ADMIN_PIN = process.env.ADMIN_PIN || '';
const DIST = join(ROOT, 'web', 'dist');

fila.carregarPadroes();

export const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});

// ---------- tempo real (Server-Sent Events) ----------
// Cada mudança avisa todas as telas abertas; elas rebuscam /api/state. Se a conexão cair,
// o navegador reconecta sozinho e as telas também atualizam por polling (rede Wi-Fi instável).

export const clientes = new Set();

function emitir(evento = 'changed') {
  const msg = `event: ${evento}\ndata: ${Date.now()}\n\n`;
  for (const res of clientes) res.write(msg);
}

app.get('/api/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  clientes.add(res);
  const batida = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => {
    clearInterval(batida);
    clientes.delete(res);
  });
});

// ---------- autenticação opcional dos Ajustes (ADMIN_PIN) ----------

const hash = (s) => createHash('sha256').update(String(s)).digest();
const pinConfere = (dado) => timingSafeEqual(hash(dado), hash(ADMIN_PIN));
const falhas = new Map(); // ip → { n, ate }

function admin(req, _res, next) {
  if (!ADMIN_PIN) return next();
  if (!pinConfere(req.get('x-admin-pin') || '')) throw new HttpError(401, 'PIN de administrador necessário.');
  next();
}

const ass = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const json = express.json({ limit: '64kb' });

app.get('/api/auth', (_req, res) => res.json({ pinRequired: !!ADMIN_PIN }));

app.post('/api/auth/verificar', json, (req, res) => {
  const ip = req.ip;
  const f = falhas.get(ip);
  if (f && f.n >= 5 && Date.now() < f.ate) throw new HttpError(429, 'Muitas tentativas. Aguarde um minuto.');
  if (!ADMIN_PIN || pinConfere(req.body?.pin || '')) {
    falhas.delete(ip);
    return res.json({ ok: true });
  }
  falhas.set(ip, { n: (f?.n || 0) + 1, ate: Date.now() + 60000 });
  throw new HttpError(401, 'PIN incorreto.');
});

// ---------- leitura ----------

// O nome do arquivo do logo é um UUID novo a cada upload, então o navegador nunca usa um logo antigo em cache.
const configPublica = () => {
  const { logo_file, ...resto } = lerConfig();
  return { ...resto, logo_url: logo_file ? `/marca/${logo_file}` : null };
};

app.get('/api/health', (_req, res) => res.json({ ok: true, hora: new Date().toISOString() }));

app.get('/api/config', (_req, res) => res.json(configPublica()));

// IPs deste computador na rede (para montar os endereços das telas na TV, tablet e consultórios).
app.get('/api/info', (_req, res) => {
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  res.json({ ips, porta: Number(process.env.PORT) || 3000, versao: process.env.npm_package_version || null });
});

app.get('/api/state', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    servicos: fila.listarServicos(),
    salas: fila.listarSalas(),
    itens: fila.listarItens(),
    midias: media.listarMidias(),
    config: configPublica(),
    horaServidor: new Date().toISOString(),
  });
});

// ---------- fila (recepção, totem, chamador) ----------

app.post('/api/itens', json, (req, res) => {
  const novo = fila.adicionarItem(req.body || {});
  emitir();
  res.status(201).json(novo);
});

app.post('/api/itens/:id/acao', json, (req, res) => {
  const { acao, salaId, novoServicoId, motivo } = req.body || {};
  const atualizado = fila.alterarStatus(req.params.id, acao, { salaId, novoServicoId, motivo });
  emitir();
  res.json(atualizado);
});

app.post('/api/salas/:id/chamar-proximo', (req, res) => {
  const chamado = fila.chamarProximo(req.params.id);
  emitir();
  res.json(chamado);
});

// ---------- cadastros (salas, serviços) ----------

app.post('/api/salas', admin, json, (req, res) => {
  const s = fila.criarSala(req.body || {});
  emitir();
  res.status(201).json(s);
});
app.patch('/api/salas/:id', admin, json, (req, res) => {
  const s = fila.editarSala(req.params.id, req.body || {});
  emitir();
  res.json(s);
});
app.delete('/api/salas/:id', admin, (req, res) => {
  fila.excluirSala(req.params.id);
  emitir();
  res.status(204).end();
});

app.post('/api/servicos', admin, json, (req, res) => {
  const s = fila.criarServico(req.body || {});
  emitir();
  res.status(201).json(s);
});
app.patch('/api/servicos/:id', admin, json, (req, res) => {
  const s = fila.editarServico(req.params.id, req.body || {});
  emitir();
  res.json(s);
});
app.delete('/api/servicos/:id', admin, (req, res) => {
  fila.excluirServico(req.params.id);
  emitir();
  res.status(204).end();
});

// ---------- aparência, logotipo e vídeos da TV ----------

app.put('/api/config', admin, json, (req, res) => {
  validarEGravar(req.body);
  emitir();
  res.json(configPublica());
});

app.put('/api/logo', admin, ass(async (req, res) => {
  await media.enviarLogo(req, String(req.query.nome || ''));
  emitir();
  res.json(configPublica());
}));
app.delete('/api/logo', admin, ass(async (_req, res) => {
  await media.removerLogo();
  emitir();
  res.json(configPublica());
}));

app.put('/api/midias', admin, ass(async (req, res) => {
  const novo = await media.enviarVideo(req, String(req.query.nome || ''));
  emitir();
  res.status(201).json(novo);
}));
app.post('/api/midias/ordem', admin, json, (req, res) => {
  const lista = media.reordenarMidias(req.body?.ids);
  emitir();
  res.json(lista);
});
app.patch('/api/midias/:id', admin, json, (req, res) => {
  const m = media.editarMidia(req.params.id, req.body || {});
  emitir();
  res.json(m);
});
app.delete('/api/midias/:id', admin, ass(async (req, res) => {
  await media.excluirMidia(req.params.id);
  emitir();
  res.status(204).end();
}));

// Cópia consistente do banco (mesmo com o sistema em uso) para guardar como backup.
app.get('/api/backup', admin, ass(async (_req, res) => {
  const tmp = join(tmpdir(), `fila-backup-${Date.now()}.db`);
  await copiarBanco(tmp);
  const dia = new Date().toISOString().slice(0, 10);
  res.download(tmp, `fila-presencial-${dia}.db`, () => rm(tmp, { force: true }));
}));

// ---------- arquivos enviados (com suporte a Range: obrigatório para vídeo em TVs e Safari) ----------

app.use(
  '/midia',
  express.static(VIDEOS_DIR, { acceptRanges: true, immutable: true, maxAge: '30d', fallthrough: false, index: false }),
);
app.use(
  '/marca',
  (_req, res, next) => {
    // SVG enviado pelo administrador nunca executa script, mesmo se aberto direto.
    res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    next();
  },
  express.static(BRAND_DIR, { maxAge: '1h', fallthrough: false, index: false }),
);

// ---------- interface web (React compilado) ----------

const indexPath = join(DIST, 'index.html');
export const semBuild = !existsSync(indexPath);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// Injeta nome, favicon e cores direto no HTML: a página já nasce com a identidade da clínica.
function paginaInicial() {
  const cfg = configPublica();
  const cabeca = [
    `<style id="tema-marca">${cssDaCor(cfg.brand_color)}</style>`,
    `<script>window.__FILA_CONFIG__=${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script>`,
    `<link rel="icon" type="image/png" href="${esc(cfg.logo_url || '/logo-vetbots-simbolo.png')}">`,
  ].join('');
  return readFileSync(indexPath, 'utf8')
    .replace(/<title>.*?<\/title>/, `<title>${esc(cfg.clinic_name)} · Fila</title>`)
    .replace('<!--FILA:HEAD-->', cabeca);
}

// Guia de instalação e Help guiado (docs/instalacao.html + MP3 do tour) em /ajuda/
app.use('/ajuda', express.static(join(ROOT, 'docs'), { index: 'instalacao.html', maxAge: '1h' }));

if (semBuild) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res
      .status(503)
      .type('text/plain; charset=utf-8')
      .send('A interface ainda não foi gerada. No terminal, dentro da pasta do projeto, rode:\n\n  npm run build\n\ne reinicie com: npm start\n');
  });
} else {
  app.use('/assets', express.static(join(DIST, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    if (/\.\w+$/.test(req.path)) {
      const arquivo = join(DIST, req.path);
      if (arquivo.startsWith(DIST) && existsSync(arquivo) && statSync(arquivo).isFile()) return res.sendFile(arquivo);
      return res.status(404).end();
    }
    res.set('Cache-Control', 'no-cache').type('html').send(paginaInicial());
  });
}

// ---------- erros ----------

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Rota não encontrada.')));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err instanceof HttpError ? err.status : err.status || 500;
  if (status >= 500) console.error('[erro]', err);
  if (res.headersSent) return res.destroy();
  if (status === 413) res.set('Connection', 'close');
  res.status(status).json({ erro: status >= 500 ? 'Erro interno do servidor.' : err.message });
});

