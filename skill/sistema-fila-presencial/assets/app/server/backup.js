// Backup e persistência do banco SQLite: cópia consistente, restauração e exportação/importação de dados.
// 100% local, sem dependência de internet ou banco externo.
import { mkdirSync, readdirSync, rmSync, existsSync, statSync, copyFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { db, DB_FILE, copiarBanco, DATA_DIR, diaLocal, agora, migrate, transacao } from './db.js';
import { lerConfig, validarEGravar } from './config.js';
import { HttpError } from './http-error.js';
import * as fila from './queue.js';

// Importação dinâmica do DatabaseSync para validação segura de arquivos de banco antes da substituição.
const { DatabaseSync } = await import('node:sqlite');

export const BACKUPS_DIR = join(DATA_DIR, 'backups');

/** Valida se um arquivo no disco é um SQLite autêntico com a estrutura esperada do sistema. */
export function validarArquivoBanco(caminho) {
  try {
    const teste = new DatabaseSync(caminho);
    try {
      const tabelas = teste.prepare("select name from sqlite_master where type='table'").all().map((r) => r.name);
      if (!tabelas.includes('fila_itens') || !tabelas.includes('config')) {
        throw new HttpError(400, 'O arquivo não é um banco de dados válido do sistema de fila.');
      }
    } finally {
      teste.close();
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(400, `Arquivo de banco inválido ou corrompido: ${err.message}`);
  }
}

/** Grava data/backups/<prefixo>-AAAA-MM-DD[_HHMMSS].db e mantém os `manter` mais recentes desse prefixo. */
export async function fazerBackup({ prefixo = 'manual', manter = 30, comHora = false } = {}) {
  mkdirSync(BACKUPS_DIR, { recursive: true });
  const p = (n) => String(n).padStart(2, '0');
  const d = new Date();
  const sufixo = comHora ? `_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}` : '';
  const nome = `${prefixo}-${diaLocal(d)}${sufixo}.db`;
  const destino = join(BACKUPS_DIR, nome);

  await copiarBanco(destino);

  const antigos = readdirSync(BACKUPS_DIR)
    .filter((f) => f.startsWith(`${prefixo}-`) && f.endsWith('.db'))
    .sort()
    .reverse()
    .slice(manter);
  for (const f of antigos) rmSync(join(BACKUPS_DIR, f), { force: true });

  const stat = statSync(destino);
  return {
    arquivo: nome,
    caminho: destino,
    tamanho: stat.size,
    criado_em: stat.mtime.toISOString(),
    tipo: prefixo,
  };
}

/** Lista todos os backups armazenados localmente em data/backups/ ordenados do mais recente ao mais antigo. */
export function listarBackups() {
  if (!existsSync(BACKUPS_DIR)) return [];
  return readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const caminho = join(BACKUPS_DIR, f);
      try {
        const stat = statSync(caminho);
        let tipo = 'outro';
        if (f.startsWith('auto-')) tipo = 'auto';
        else if (f.startsWith('manual-')) tipo = 'manual';
        else if (f.startsWith('pre-')) tipo = 'pre-restauracao';
        return {
          arquivo: f,
          tamanho: stat.size,
          criado_em: stat.mtime.toISOString(),
          tipo,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em));
}

/** Retorna métricas de integridade e tamanho do armazenamento SQLite local. */
export function obterEstatisticasBanco() {
  let tamanhoBytes = 0;
  for (const ext of ['', '-wal', '-shm']) {
    const f = `${DB_FILE}${ext}`;
    if (existsSync(f)) {
      try {
        tamanhoBytes += statSync(f).size;
      } catch {
        /* ignora se bloqueado temporariamente */
      }
    }
  }

  const totalItens = db.prepare('select count(*) as c from fila_itens').get()?.c || 0;
  const totalAtivos =
    db.prepare("select count(*) as c from fila_itens where status in ('aguardando', 'chamado', 'em_atendimento')").get()
      ?.c || 0;
  const totalSalas = db.prepare('select count(*) as c from fila_salas').get()?.c || 0;
  const totalServicos = db.prepare('select count(*) as c from fila_servicos').get()?.c || 0;
  const totalVeterinarios = db.prepare('select count(*) as c from fila_veterinarios').get()?.c || 0;

  const backups = listarBackups();
  const ultimoBackup = backups[0]?.criado_em || null;

  return {
    tamanhoBancoBytes: tamanhoBytes,
    totalItens,
    totalAtivos,
    totalSalas,
    totalServicos,
    totalVeterinarios,
    totalBackups: backups.length,
    ultimoBackup,
    caminhoBanco: 'data/fila.db',
  };
}

/**
 * Substitui o banco ativo com segurança:
 * 1. Valida o arquivo recebido antes de tocar no banco em uso.
 * 2. Faz backup de segurança do estado atual (pre-restauracao).
 * 3. Fecha conexões, remove logs WAL residuais e copia o novo arquivo.
 * 4. Reabre o banco, aplica pragmas e roda migrações se necessário.
 */
export async function substituirBanco(origem) {
  validarArquivoBanco(origem);

  await fazerBackup({ prefixo: 'pre-restauracao', manter: 10, comHora: true });

  db.close();

  rmSync(`${DB_FILE}-wal`, { force: true });
  rmSync(`${DB_FILE}-shm`, { force: true });

  copyFileSync(origem, DB_FILE);

  db.open(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

  migrate();
  fila.carregarPadroes();

  return true;
}

/** Restaura o banco a partir de um backup local em data/backups/. */
export async function restaurarBackupLocal(arquivo) {
  const seguro = basename(arquivo || '');
  if (!seguro || !seguro.endsWith('.db') || !/^[a-zA-Z0-9_.-]+$/.test(seguro)) {
    throw new HttpError(400, 'Nome de arquivo de backup inválido.');
  }
  const caminho = join(BACKUPS_DIR, seguro);
  if (!existsSync(caminho)) throw new HttpError(404, 'Arquivo de backup não encontrado.');
  await substituirBanco(caminho);
  return { ok: true, arquivo: seguro };
}

/** Remove um arquivo de backup local em data/backups/. */
export function excluirBackupLocal(arquivo) {
  const seguro = basename(arquivo || '');
  if (!seguro || !seguro.endsWith('.db') || !/^[a-zA-Z0-9_.-]+$/.test(seguro)) {
    throw new HttpError(400, 'Nome de arquivo de backup inválido.');
  }
  const caminho = join(BACKUPS_DIR, seguro);
  if (!existsSync(caminho)) throw new HttpError(404, 'Arquivo de backup não encontrado.');
  rmSync(caminho, { force: true });
  return { ok: true, arquivo: seguro };
}

/** Exporta todos os dados (configuração, serviços, salas, veterinários, fila e chamadas) em JSON versionado. */
export function exportarDadosJson() {
  const config = lerConfig();
  const servicos = db.prepare('select * from fila_servicos order by ordem, nome').all();
  const salas = db.prepare('select * from fila_salas order by nome').all();
  const veterinarios = db.prepare('select * from fila_veterinarios order by ordem, nome').all();
  const itens = db.prepare('select * from fila_itens order by chegada_em').all();
  const chamadas = db.prepare('select * from fila_chamadas order by created_at').all();

  return {
    versao: 1,
    sistema: 'vetbots-fila-presencial',
    exportado_em: agora(),
    config,
    servicos,
    salas,
    veterinarios,
    itens,
    chamadas,
  };
}

/** Importa dados em JSON atomicamente dentro de uma transação. */
export async function importarDadosJson(dados, { modo = 'tudo' } = {}) {
  if (!dados || typeof dados !== 'object') throw new HttpError(400, 'Arquivo JSON inválido.');

  await fazerBackup({ prefixo: 'pre-importacao', manter: 10, comHora: true });

  const detalhes = {
    configAtualizada: false,
    servicosImportados: 0,
    salasImportadas: 0,
    veterinariosImportados: 0,
    itensImportados: 0,
  };

  transacao(
    () => {
      // 1. Configurações da clínica
      if (dados.config && typeof dados.config === 'object') {
        validarEGravar(dados.config);
        detalhes.configAtualizada = true;
      }

      // 2. Serviços
      if (Array.isArray(dados.servicos)) {
        const insServico = db.prepare(`
          insert into fila_servicos (id, nome, prefixo, ativo, ordem, created_at)
          values (?, ?, ?, ?, ?, ?)
          on conflict(id) do update set
            nome = excluded.nome,
            prefixo = excluded.prefixo,
            ativo = excluded.ativo,
            ordem = excluded.ordem
        `);
        for (const s of dados.servicos) {
          if (s?.id && s?.nome && s?.prefixo) {
            insServico.run(s.id, s.nome, s.prefixo, s.ativo ? 1 : 0, Number(s.ordem) || 0, s.created_at || agora());
            detalhes.servicosImportados++;
          }
        }
      }

      // 3. Salas
      if (Array.isArray(dados.salas)) {
        const insSala = db.prepare(`
          insert into fila_salas (id, nome, ativa, created_at)
          values (?, ?, ?, ?)
          on conflict(id) do update set
            nome = excluded.nome,
            ativa = excluded.ativa
        `);
        for (const r of dados.salas) {
          if (r?.id && r?.nome) {
            insSala.run(r.id, r.nome, r.ativa ? 1 : 0, r.created_at || agora());
            detalhes.salasImportadas++;
          }
        }
      }

      // 4. Equipe de Veterinários
      if (Array.isArray(dados.veterinarios)) {
        const insVet = db.prepare(`
          insert into fila_veterinarios (id, nome, crmv, ativo, ordem, created_at)
          values (?, ?, ?, ?, ?, ?)
          on conflict(id) do update set
            nome = excluded.nome,
            crmv = excluded.crmv,
            ativo = excluded.ativo,
            ordem = excluded.ordem
        `);
        for (const v of dados.veterinarios) {
          if (v?.id && v?.nome) {
            insVet.run(v.id, v.nome, v.crmv || null, v.ativo ? 1 : 0, Number(v.ordem) || 0, v.created_at || agora());
            detalhes.veterinariosImportados++;
          }
        }
      }

      // 5. Itens da fila e histórico de chamadas (quando modo === 'tudo')
      if (modo === 'tudo') {
        if (Array.isArray(dados.itens)) {
          const insItem = db.prepare(`
            insert into fila_itens (
              id, senha, ciclo, servico_id, sala_id, tutor_nome, pet_nome, veterinario_nome,
              prioridade, status, motivo_resumido, chegada_em, chamado_em, iniciado_em,
              finalizado_em, ausente_em, cancelado_em, historico_transferencias, created_at, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(id) do update set
              senha = excluded.senha,
              ciclo = excluded.ciclo,
              servico_id = excluded.servico_id,
              sala_id = excluded.sala_id,
              tutor_nome = excluded.tutor_nome,
              pet_nome = excluded.pet_nome,
              veterinario_nome = excluded.veterinario_nome,
              prioridade = excluded.prioridade,
              status = excluded.status,
              motivo_resumido = excluded.motivo_resumido,
              chegada_em = excluded.chegada_em,
              chamado_em = excluded.chamado_em,
              iniciado_em = excluded.iniciado_em,
              finalizado_em = excluded.finalizado_em,
              ausente_em = excluded.ausente_em,
              cancelado_em = excluded.cancelado_em,
              historico_transferencias = excluded.historico_transferencias,
              updated_at = excluded.updated_at
          `);
          for (const item of dados.itens) {
            if (item?.id && item?.senha && item?.tutor_nome && item?.servico_id) {
              const hist =
                typeof item.historico_transferencias === 'string'
                  ? item.historico_transferencias
                  : JSON.stringify(item.historico_transferencias || []);
              insItem.run(
                item.id,
                item.senha,
                item.ciclo || diaLocal(),
                item.servico_id,
                item.sala_id || null,
                item.tutor_nome,
                item.pet_nome || null,
                item.veterinario_nome || null,
                item.prioridade || 'normal',
                item.status || 'aguardando',
                item.motivo_resumido || null,
                item.chegada_em || agora(),
                item.chamado_em || null,
                item.iniciado_em || null,
                item.finalizado_em || null,
                item.ausente_em || null,
                item.cancelado_em || null,
                hist,
                item.created_at || agora(),
                item.updated_at || agora(),
              );
              detalhes.itensImportados++;
            }
          }
        }

        if (Array.isArray(dados.chamadas)) {
          const insChamada = db.prepare(`
            insert into fila_chamadas (id, item_id, sala_id, created_at)
            values (?, ?, ?, ?)
            on conflict(id) do nothing
          `);
          for (const c of dados.chamadas) {
            if (c?.id && c?.item_id) {
              try {
                insChamada.run(c.id, c.item_id, c.sala_id || null, c.created_at || agora());
              } catch {
                /* foreign key protegida caso item_id não exista */
              }
            }
          }
        }
      }
    },
    { imediata: true },
  );

  return { ok: true, mensagem: 'Dados importados com sucesso.', detalhes };
}

/** Backup automático diário (uma cópia por dia, guarda 14). Roda ao iniciar e a cada 6 h. */
export function agendarBackupDiario() {
  const rodar = async () => {
    try {
      const hoje = join(BACKUPS_DIR, `auto-${diaLocal()}.db`);
      if (!existsSync(hoje)) await fazerBackup({ prefixo: 'auto', manter: 14 });
    } catch (e) {
      console.error('[backup] falhou:', e.message);
    }
  };
  void rodar();
  setInterval(rodar, 6 * 3600 * 1000).unref();
}

