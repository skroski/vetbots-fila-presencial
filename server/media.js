// Vídeos da TV (playlist) e logotipo: upload em streaming direto para o disco (data/uploads).
// O navegador envia o arquivo como corpo bruto de um PUT (sem multipart), então vídeos grandes
// não passam pela memória.
import { createWriteStream } from 'node:fs';
import { open, rename, rm, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { db, agora, transacao, VIDEOS_DIR, BRAND_DIR } from './db.js';
import { gravarInterno, lerConfig } from './config.js';
import { HttpError } from './http-error.js';

export const MAX_VIDEO_MB = Number(process.env.MAX_VIDEO_MB) || 2048;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

// Confere os primeiros bytes do arquivo (não confia só na extensão).
const ASSINATURAS = {
  '.mp4': (b) => b.subarray(4, 8).toString('latin1') === 'ftyp',
  '.m4v': (b) => b.subarray(4, 8).toString('latin1') === 'ftyp',
  '.webm': (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
  '.png': (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  '.jpg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  '.jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  '.webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  '.svg': (b) => /<svg[\s>]/i.test(b.toString('utf8')),
};

const nomeSeguro = (n) =>
  String(n || 'arquivo')
    .replace(/[\\/]/g, '_')
    .replace(/[\u0000-\u001f<>:"|?*]/g, '')
    .trim()
    .slice(0, 120) || 'arquivo';

async function receber(req, { dir, extensoes, maxBytes, nomeOriginal }) {
  const ext = extname(nomeSeguro(nomeOriginal)).toLowerCase();
  if (!extensoes.includes(ext)) {
    throw new HttpError(415, `Formato não suportado. Use: ${extensoes.join(', ')}.`);
  }
  const declarado = Number(req.headers['content-length']);
  if (declarado > maxBytes) throw new HttpError(413, `Arquivo maior que o limite de ${Math.round(maxBytes / 1048576)} MB.`);

  const arquivo = `${randomUUID()}${ext}`;
  const destino = join(dir, arquivo);
  const parcial = `${destino}.part`;

  let tamanho = 0;
  await new Promise((resolve, reject) => {
    const out = createWriteStream(parcial);
    let falhou = false;
    const falhar = (e) => {
      if (falhou) return;
      falhou = true;
      out.destroy();
      reject(e);
    };
    req.on('data', (chunk) => {
      tamanho += chunk.length;
      if (tamanho > maxBytes) {
        req.unpipe(out);
        falhar(new HttpError(413, `Arquivo maior que o limite de ${Math.round(maxBytes / 1048576)} MB.`));
      }
    });
    req.on('close', () => {
      if (!req.complete) falhar(new HttpError(499, 'Envio interrompido.'));
    });
    req.on('error', falhar);
    out.on('error', falhar);
    out.on('finish', resolve);
    req.pipe(out);
  }).catch(async (e) => {
    await rm(parcial, { force: true });
    throw e;
  });

  try {
    if (tamanho === 0) throw new HttpError(400, 'Arquivo vazio.');
    const fh = await open(parcial, 'r');
    const cabeca = Buffer.alloc(512);
    const { bytesRead } = await fh.read(cabeca, 0, 512, 0);
    await fh.close();
    if (!ASSINATURAS[ext](cabeca.subarray(0, bytesRead))) {
      throw new HttpError(415, 'O conteúdo do arquivo não corresponde ao formato informado.');
    }
    await rename(parcial, destino);
  } catch (e) {
    await rm(parcial, { force: true });
    throw e;
  }
  return { arquivo, tamanho, nome: nomeSeguro(nomeOriginal) };
}

// ---------- vídeos ----------

const midia = (r) => ({
  id: r.id,
  nome: r.nome,
  arquivo: r.arquivo,
  url: `/midia/${r.arquivo}`,
  tamanho: r.tamanho,
  ordem: r.ordem,
  ativo: !!r.ativo,
});

export const listarMidias = () => db.prepare('select * from midias order by ordem, created_at').all().map(midia);

export async function enviarVideo(req, nomeOriginal) {
  const r = await receber(req, {
    dir: VIDEOS_DIR,
    extensoes: ['.mp4', '.m4v', '.webm'],
    maxBytes: MAX_VIDEO_MB * 1048576,
    nomeOriginal,
  });
  const id = randomUUID();
  const ordem = db.prepare('select coalesce(max(ordem), -1) + 1 as o from midias').get().o;
  db.prepare('insert into midias (id, nome, arquivo, tamanho, ordem, created_at) values (?, ?, ?, ?, ?, ?)').run(
    id, r.nome, r.arquivo, r.tamanho, ordem, agora(),
  );
  return midia(db.prepare('select * from midias where id = ?').get(id));
}

export function editarMidia(id, { ativo, nome }) {
  const atual = db.prepare('select * from midias where id = ?').get(id);
  if (!atual) throw new HttpError(404, 'Vídeo não encontrado.');
  db.prepare('update midias set ativo = ?, nome = ? where id = ?').run(
    ativo === undefined ? atual.ativo : ativo ? 1 : 0,
    nome === undefined ? atual.nome : nomeSeguro(nome),
    id,
  );
  return midia(db.prepare('select * from midias where id = ?').get(id));
}

export function reordenarMidias(ids) {
  if (!Array.isArray(ids)) throw new HttpError(400, 'Lista de ids inválida.');
  const upd = db.prepare('update midias set ordem = ? where id = ?');
  transacao(() => ids.forEach((id, i) => upd.run(i, String(id))));
  return listarMidias();
}

export async function excluirMidia(id) {
  const atual = db.prepare('select * from midias where id = ?').get(id);
  if (!atual) throw new HttpError(404, 'Vídeo não encontrado.');
  db.prepare('delete from midias where id = ?').run(id);
  await rm(join(VIDEOS_DIR, atual.arquivo), { force: true });
}

// ---------- logotipo ----------

export async function enviarLogo(req, nomeOriginal) {
  const r = await receber(req, {
    dir: BRAND_DIR,
    extensoes: ['.png', '.jpg', '.jpeg', '.webp', '.svg'],
    maxBytes: MAX_LOGO_BYTES,
    nomeOriginal,
  });
  const anterior = lerConfig().logo_file;
  gravarInterno('logo_file', r.arquivo);
  if (anterior) await rm(join(BRAND_DIR, anterior), { force: true });
  return r.arquivo;
}

export async function removerLogo() {
  const anterior = lerConfig().logo_file;
  gravarInterno('logo_file', '');
  if (anterior) await rm(join(BRAND_DIR, anterior), { force: true });
}

// Remove sobras de uploads interrompidos (.part) de execuções anteriores.
export async function limparParciais() {
  for (const dir of [VIDEOS_DIR, BRAND_DIR]) {
    for (const f of await readdir(dir)) if (f.endsWith('.part')) await rm(join(dir, f), { force: true });
  }
}
