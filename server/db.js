// Banco de dados SQLite (um único arquivo em data/fila.db).
// Sem servidor de banco, sem conta, sem internet.
// Usa o SQLite embutido no próprio Node (node:sqlite): nada para compilar nem baixar no npm install.
import './silenciar-aviso.js';
// Importação dinâmica: o aviso "experimental" do Node 22 sai no momento do carregamento, e aqui já está silenciado.
const { DatabaseSync, backup } = await import('node:sqlite');
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = resolve(process.env.DATA_DIR || join(ROOT, 'data'));
export const VIDEOS_DIR = join(DATA_DIR, 'uploads', 'videos');
export const BRAND_DIR = join(DATA_DIR, 'uploads', 'marca');

for (const dir of [DATA_DIR, VIDEOS_DIR, BRAND_DIR]) mkdirSync(dir, { recursive: true });

export const DB_FILE = join(DATA_DIR, 'fila.db');
export const db = new DatabaseSync(DB_FILE);

// WAL: leitura (TV, recepção) não bloqueia escrita (chamador). busy_timeout evita "database is locked".
db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

/**
 * Executa `fn` dentro de uma transação (confirma ao terminar, desfaz se der erro).
 * `imediata: true` trava a escrita já no início (BEGIN IMMEDIATE): é o que serializa a geração de senhas
 * e o "Chamar Próximo".
 */
export function transacao(fn, { imediata = false } = {}) {
  db.exec(imediata ? 'BEGIN IMMEDIATE' : 'BEGIN');
  try {
    const resultado = fn();
    db.exec('COMMIT');
    return resultado;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Violação de UNIQUE/CHECK/FOREIGN KEY (códigos SQLite 19 e derivados). */
export const emConflito = (e) => (e?.errcode & 0xff) === 19;

/** Cópia consistente do banco (funciona com o sistema em uso). */
export const copiarBanco = (destino) => backup(db, destino);

// Cada item é aplicado uma vez; a versão fica em PRAGMA user_version. Para evoluir o banco,
// acrescente um novo item ao FINAL da lista (nunca edite os anteriores).
// Datas são sempre texto ISO-8601 em UTC com "Z" (gerado em JS), que o navegador entende em qualquer TV.
const MIGRATIONS = [
  `
  create table fila_servicos (
    id         text primary key,
    nome       text not null unique,
    prefixo    text not null default 'A',
    ativo      integer not null default 1,
    ordem      integer not null default 0,
    created_at text not null
  );

  create table fila_salas (
    id         text primary key,
    nome       text not null unique,
    ativa      integer not null default 1,
    created_at text not null
  );

  create table fila_itens (
    id                       text primary key,
    senha                    text not null,
    ciclo                    text not null,           -- dia (AAAA-MM-DD) ou 'continuo': escopo da numeração
    servico_id               text not null references fila_servicos(id),
    sala_id                  text references fila_salas(id),
    tutor_nome               text not null,
    pet_nome                 text,
    veterinario_nome         text,
    prioridade               text not null default 'normal'
                               check (prioridade in ('normal', 'prioridade', 'emergencia')),
    status                   text not null default 'aguardando'
                               check (status in ('aguardando', 'chamado', 'em_atendimento', 'finalizado', 'ausente', 'cancelado')),
    motivo_resumido          text,
    chegada_em               text not null,
    chamado_em               text,
    iniciado_em              text,
    finalizado_em            text,
    ausente_em               text,
    cancelado_em             text,
    historico_transferencias text not null default '[]',
    created_at               text not null,
    updated_at               text not null
  );
  create unique index fila_itens_senha_ciclo_uq on fila_itens(ciclo, senha);
  create index fila_itens_ordenacao_idx on fila_itens(status, prioridade, chegada_em);
  create index fila_itens_chegada_idx on fila_itens(chegada_em);
  create index fila_itens_sala_idx on fila_itens(sala_id, status);

  create table fila_chamadas (
    id         text primary key,
    item_id    text not null references fila_itens(id) on delete cascade,
    sala_id    text references fila_salas(id),
    created_at text not null
  );
  create index fila_chamadas_created_idx on fila_chamadas(created_at);

  create table config (
    chave text primary key,
    valor text not null
  );

  create table midias (
    id         text primary key,
    nome       text not null,
    arquivo    text not null unique,
    tamanho    integer not null default 0,
    ordem      integer not null default 0,
    ativo      integer not null default 1,
    created_at text not null
  );
  `,
  // 2: vídeos do YouTube na playlist (a TV carrega o player oficial; só esses itens precisam de internet)
  `
  alter table midias add column tipo text not null default 'arquivo' check (tipo in ('arquivo', 'youtube'));
  alter table midias add column youtube_id text;
  `,
  // 3: equipe de veterinários / profissionais
  `
  create table fila_veterinarios (
    id         text primary key,
    nome       text not null unique,
    crmv       text,
    ativo      integer not null default 1,
    ordem      integer not null default 0,
    created_at text not null
  );
  `,
];

export function migrate() {
  const { user_version: atual } = db.prepare('PRAGMA user_version').get();
  for (let v = atual; v < MIGRATIONS.length; v++) {
    transacao(() => {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

migrate();

export const agora = () => new Date().toISOString();

// Dia local do servidor (AAAA-MM-DD): a numeração das senhas reinicia a cada dia.
export function diaLocal(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
