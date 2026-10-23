// Regras da fila: emitir senha, mudar status (chamar, iniciar, finalizar...) e "Chamar Próximo".
// O SQLite do Node é síncrono e uma transação IMMEDIATE trava a escrita, então a geração da senha
// é atômica.
import { randomUUID } from 'node:crypto';
import { db, agora, diaLocal, transacao, emConflito } from './db.js';
import { lerConfig } from './config.js';
import { HttpError } from './http-error.js';

const PRIORIDADES = ['normal', 'prioridade', 'emergencia'];
const ACOES = ['chamar', 'iniciar', 'finalizar', 'ausente', 'retornar', 'cancelar', 'transferir'];
const ATIVOS = ['aguardando', 'chamado', 'em_atendimento'];
const DIAS_HISTORICO = 30;

const ORDEM_PRIORIDADE = `case prioridade when 'emergencia' then 0 when 'prioridade' then 1 else 2 end`;

// ---------- serialização (SQLite guarda 0/1 e JSON em texto; o front espera boolean/array) ----------

const servico = (r) => ({ id: r.id, nome: r.nome, prefixo: r.prefixo, ativo: !!r.ativo, ordem: r.ordem });
const sala = (r) => ({ id: r.id, nome: r.nome, ativa: !!r.ativa });
const item = (r) => ({ ...r, historico_transferencias: JSON.parse(r.historico_transferencias || '[]') });

const texto = (v, max, rotulo, { obrigatorio = false } = {}) => {
  const t = typeof v === 'string' ? v.trim() : '';
  if (obrigatorio && !t) throw new HttpError(400, `${rotulo} é obrigatório.`);
  return t ? t.slice(0, max) : null;
};

// ---------- leitura ----------

export function listarServicos() {
  return db.prepare('select * from fila_servicos order by ordem, nome').all().map(servico);
}

export function listarSalas() {
  return db.prepare('select * from fila_salas order by nome').all().map(sala);
}

// Itens ativos + histórico recente (as métricas usam até 30 dias).
export function listarItens() {
  const corte = new Date(Date.now() - DIAS_HISTORICO * 86400000).toISOString();
  return db
    .prepare(
      `select * from fila_itens
        where status in ('aguardando','chamado','em_atendimento') or chegada_em >= ?
        order by chegada_em`,
    )
    .all(corte)
    .map(item);
}

// ---------- salas ----------

export function criarSala({ nome }) {
  const n = texto(nome, 60, 'Nome da sala', { obrigatorio: true });
  try {
    const id = randomUUID();
    db.prepare('insert into fila_salas (id, nome, created_at) values (?, ?, ?)').run(id, n, agora());
    return sala(db.prepare('select * from fila_salas where id = ?').get(id));
  } catch (e) {
    if (emConflito(e)) throw new HttpError(409, 'Já existe uma sala com esse nome.');
    throw e;
  }
}

export function editarSala(id, { nome, ativa }) {
  const atual = db.prepare('select * from fila_salas where id = ?').get(id);
  if (!atual) throw new HttpError(404, 'Sala não encontrada.');
  const novoNome = nome === undefined ? atual.nome : texto(nome, 60, 'Nome da sala', { obrigatorio: true });
  const novaAtiva = ativa === undefined ? atual.ativa : ativa ? 1 : 0;
  try {
    db.prepare('update fila_salas set nome = ?, ativa = ? where id = ?').run(novoNome, novaAtiva, id);
  } catch (e) {
    if (emConflito(e)) throw new HttpError(409, 'Já existe uma sala com esse nome.');
    throw e;
  }
  return sala(db.prepare('select * from fila_salas where id = ?').get(id));
}

export function excluirSala(id) {
  const emUso = db.prepare('select 1 from fila_itens where sala_id = ? limit 1').get(id);
  if (emUso) throw new HttpError(409, 'Esta sala já tem atendimentos no histórico. Desative-a em vez de excluir.');
  db.prepare('delete from fila_chamadas where sala_id = ?').run(id);
  if (!db.prepare('delete from fila_salas where id = ?').run(id).changes) throw new HttpError(404, 'Sala não encontrada.');
}

// ---------- serviços ----------

const prefixoValido = (p) => {
  const v = String(p ?? '').trim().toUpperCase();
  if (!/^[A-Z]{1,2}$/.test(v)) throw new HttpError(400, 'O prefixo deve ter 1 ou 2 letras (A-Z).');
  return v;
};

export function criarServico({ nome, prefixo }) {
  const n = texto(nome, 60, 'Nome do serviço', { obrigatorio: true });
  const p = prefixoValido(prefixo);
  try {
    const id = randomUUID();
    const ordem = (db.prepare('select coalesce(max(ordem), -1) + 1 as o from fila_servicos').get().o);
    db.prepare('insert into fila_servicos (id, nome, prefixo, ordem, created_at) values (?, ?, ?, ?, ?)').run(
      id, n, p, ordem, agora(),
    );
    return servico(db.prepare('select * from fila_servicos where id = ?').get(id));
  } catch (e) {
    if (emConflito(e)) throw new HttpError(409, 'Já existe um serviço com esse nome.');
    throw e;
  }
}

export function editarServico(id, { nome, prefixo, ativo, ordem }) {
  const atual = db.prepare('select * from fila_servicos where id = ?').get(id);
  if (!atual) throw new HttpError(404, 'Serviço não encontrado.');
  const novo = {
    nome: nome === undefined ? atual.nome : texto(nome, 60, 'Nome do serviço', { obrigatorio: true }),
    prefixo: prefixo === undefined ? atual.prefixo : prefixoValido(prefixo),
    ativo: ativo === undefined ? atual.ativo : ativo ? 1 : 0,
    ordem: Number.isInteger(ordem) ? ordem : atual.ordem,
  };
  try {
    db.prepare('update fila_servicos set nome = ?, prefixo = ?, ativo = ?, ordem = ? where id = ?').run(
      novo.nome, novo.prefixo, novo.ativo, novo.ordem, id,
    );
  } catch (e) {
    if (emConflito(e)) throw new HttpError(409, 'Já existe um serviço com esse nome.');
    throw e;
  }
  return servico(db.prepare('select * from fila_servicos where id = ?').get(id));
}

export function excluirServico(id) {
  const emUso = db.prepare('select 1 from fila_itens where servico_id = ? limit 1').get(id);
  if (emUso) throw new HttpError(409, 'Este serviço já tem atendimentos no histórico. Desative-o em vez de excluir.');
  if (!db.prepare('delete from fila_servicos where id = ?').run(id).changes) throw new HttpError(404, 'Serviço não encontrado.');
}

// ---------- veterinários ----------

const veterinario = (r) => ({
  id: r.id,
  nome: r.nome,
  crmv: r.crmv ?? null,
  ativo: r.ativo === 1,
  ordem: r.ordem,
});

export const listarVeterinarios = () =>
  db.prepare('select * from fila_veterinarios order by ordem asc, created_at asc').all().map(veterinario);

export function criarVeterinario({ nome, crmv }) {
  const n = texto(nome, 80, 'Nome do veterinário', { obrigatorio: true });
  const c = texto(crmv, 40, 'CRMV');
  try {
    const id = randomUUID();
    const ordem = db.prepare('select coalesce(max(ordem), -1) + 1 as o from fila_veterinarios').get().o;
    db.prepare('insert into fila_veterinarios (id, nome, crmv, ordem, created_at) values (?, ?, ?, ?, ?)').run(
      id, n, c, ordem, agora(),
    );
    return veterinario(db.prepare('select * from fila_veterinarios where id = ?').get(id));
  } catch (e) {
    if (emConflito(e)) throw new HttpError(409, 'Já existe um profissional cadastrado com esse nome.');
    throw e;
  }
}

export function editarVeterinario(id, { nome, crmv, ativo, ordem }) {
  const atual = db.prepare('select * from fila_veterinarios where id = ?').get(id);
  if (!atual) throw new HttpError(404, 'Veterinário não encontrado.');
  const novo = {
    nome: nome === undefined ? atual.nome : texto(nome, 80, 'Nome do veterinário', { obrigatorio: true }),
    crmv: crmv === undefined ? atual.crmv : texto(crmv, 40, 'CRMV'),
    ativo: ativo === undefined ? atual.ativo : ativo ? 1 : 0,
    ordem: Number.isInteger(ordem) ? ordem : atual.ordem,
  };
  try {
    db.prepare('update fila_veterinarios set nome = ?, crmv = ?, ativo = ?, ordem = ? where id = ?').run(
      novo.nome, novo.crmv, novo.ativo, novo.ordem, id,
    );
  } catch (e) {
    if (emConflito(e)) throw new HttpError(409, 'Já existe um profissional cadastrado com esse nome.');
    throw e;
  }
  return veterinario(db.prepare('select * from fila_veterinarios where id = ?').get(id));
}

export function excluirVeterinario(id) {
  if (!db.prepare('delete from fila_veterinarios where id = ?').run(id).changes) {
    throw new HttpError(404, 'Veterinário não encontrado.');
  }
}

// ---------- senhas ----------

export function adicionarItem(p) {
  const tutor = texto(p.tutorNome, 120, 'Nome do tutor', { obrigatorio: true });
  const prioridade = p.prioridade ?? 'normal';
  if (!PRIORIDADES.includes(prioridade)) throw new HttpError(400, 'Prioridade inválida.');

  return transacao(
    () => {
      const srv = db.prepare('select * from fila_servicos where id = ? and ativo = 1').get(p.servicoId);
      if (!srv) throw new HttpError(400, 'Serviço indisponível.');
      if (p.salaId && !db.prepare('select 1 from fila_salas where id = ?').get(p.salaId)) {
        throw new HttpError(400, 'Sala inexistente.');
      }

      const ciclo = lerConfig().reset_daily ? diaLocal() : 'continuo';
      // Próximo número do prefixo dentro do ciclo. Itens ainda ativos de dias anteriores (esquecidos na fila)
      // também entram na conta: assim nunca existem duas senhas iguais ativas ao mesmo tempo.
      // O índice único (ciclo, senha) é a segunda barreira.
      const { max } = db
        .prepare(
          `select max(cast(substr(senha, length(?) + 1) as integer)) as max
             from fila_itens
            where senha glob ? || '[0-9]*'
              and (ciclo = ? or status in ('aguardando', 'chamado', 'em_atendimento'))`,
        )
        .get(srv.prefixo, srv.prefixo, ciclo);
      const senha = `${srv.prefixo}${String((max ?? 0) + 1).padStart(3, '0')}`;

      const id = randomUUID();
      const t = agora();
      db.prepare(
        `insert into fila_itens
           (id, senha, ciclo, servico_id, sala_id, tutor_nome, pet_nome, veterinario_nome, prioridade,
            motivo_resumido, chegada_em, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id, senha, ciclo, srv.id, p.salaId || null, tutor,
        texto(p.petNome, 120, 'Pet'),
        texto(p.veterinarioNome, 120, 'Veterinário'),
        prioridade,
        texto(p.motivoResumido, 300, 'Motivo'),
        t, t, t,
      );
      return item(db.prepare('select * from fila_itens where id = ?').get(id));
    },
    { imediata: true },
  );
}

// ---------- mudanças de status ----------

function aplicarAcao(id, acao, { salaId, novoServicoId, motivo, veterinarioNome } = {}) {
  if (!ACOES.includes(acao)) throw new HttpError(400, 'Ação de fila inválida.');
  const atual = db.prepare('select * from fila_itens where id = ?').get(id);
  if (!atual) throw new HttpError(404, 'Item da fila não encontrado.');
  if (['finalizado', 'cancelado'].includes(atual.status)) {
    throw new HttpError(409, 'Este atendimento já foi encerrado.');
  }
  if (salaId && !db.prepare('select 1 from fila_salas where id = ?').get(salaId)) {
    throw new HttpError(400, 'Sala inexistente.');
  }
  if (novoServicoId && !db.prepare('select 1 from fila_servicos where id = ?').get(novoServicoId)) {
    throw new HttpError(400, 'Serviço inexistente.');
  }

  const n = { ...atual };
  const t = agora();
  if (veterinarioNome !== undefined) {
    n.veterinario_nome = texto(veterinarioNome, 120, 'Veterinário');
  }
  switch (acao) {
    case 'chamar':
      n.status = 'chamado';
      n.chamado_em = t;
      if (salaId) n.sala_id = salaId;
      break;
    case 'iniciar':
      n.status = 'em_atendimento';
      n.iniciado_em = t;
      if (salaId) n.sala_id = salaId;
      break;
    case 'finalizar':
      n.status = 'finalizado';
      n.finalizado_em = t;
      break;
    case 'ausente':
      n.status = 'ausente';
      n.ausente_em = t;
      break;
    case 'retornar':
      n.status = 'aguardando';
      n.chamado_em = null;
      break;
    case 'cancelar':
      n.status = 'cancelado';
      n.cancelado_em = t;
      break;
    case 'transferir': {
      // Mantém o status e o horário de chegada original (não perde a vez na fila).
      const historico = JSON.parse(atual.historico_transferencias || '[]');
      historico.push({
        data: t,
        sala_origem: atual.sala_id,
        sala_destino: salaId || atual.sala_id,
        servico_origem: atual.servico_id,
        servico_destino: novoServicoId || atual.servico_id,
        motivo: texto(motivo, 300, 'Motivo'),
      });
      n.historico_transferencias = JSON.stringify(historico);
      if (salaId) n.sala_id = salaId;
      if (novoServicoId) n.servico_id = novoServicoId;
      break;
    }
  }

  db.prepare(
    `update fila_itens set status = ?, sala_id = ?, servico_id = ?, veterinario_nome = ?, chamado_em = ?, iniciado_em = ?,
            finalizado_em = ?, ausente_em = ?, cancelado_em = ?, historico_transferencias = ?, updated_at = ?
      where id = ?`,
  ).run(
    n.status, n.sala_id, n.servico_id, n.veterinario_nome, n.chamado_em, n.iniciado_em,
    n.finalizado_em, n.ausente_em, n.cancelado_em, n.historico_transferencias, t, id,
  );

  if (acao === 'chamar') {
    db.prepare('insert into fila_chamadas (id, item_id, sala_id, created_at) values (?, ?, ?, ?)').run(
      randomUUID(), id, n.sala_id, t,
    );
  }
  return item(db.prepare('select * from fila_itens where id = ?').get(id));
}

export function alterarStatus(id, acao, extra) {
  return transacao(() => aplicarAcao(id, acao, extra), { imediata: true });
}

export function editarItem(id, p = {}) {
  return transacao(() => {
    const atual = db.prepare('select * from fila_itens where id = ?').get(id);
    if (!atual) throw new HttpError(404, 'Item da fila não encontrado.');

    const tutorEntrada = p.tutorNome !== undefined ? p.tutorNome : p.tutor_nome;
    const petEntrada = p.petNome !== undefined ? p.petNome : p.pet_nome;
    const vetEntrada = p.veterinarioNome !== undefined ? p.veterinarioNome : p.veterinario_nome;
    const motEntrada = p.motivoResumido !== undefined ? p.motivoResumido : p.motivo_resumido;
    const salaEntrada = p.salaId !== undefined ? p.salaId : p.sala_id;
    const srvEntrada = p.servicoId !== undefined ? p.servicoId : p.servico_id;

    if (tutorEntrada !== undefined && !String(tutorEntrada).trim()) {
      throw new HttpError(400, 'Informe o nome do tutor.');
    }
    if (p.prioridade !== undefined && !PRIORIDADES.includes(p.prioridade)) {
      throw new HttpError(400, 'Prioridade inválida.');
    }
    if (salaEntrada && !db.prepare('select 1 from fila_salas where id = ?').get(salaEntrada)) {
      throw new HttpError(400, 'Sala inexistente.');
    }
    if (srvEntrada && !db.prepare('select 1 from fila_servicos where id = ?').get(srvEntrada)) {
      throw new HttpError(400, 'Serviço inexistente.');
    }

    const tutor = tutorEntrada === undefined ? atual.tutor_nome : texto(tutorEntrada, 120, 'Nome do tutor', { obrigatorio: true });
    const pet = petEntrada === undefined ? atual.pet_nome : texto(petEntrada, 120, 'Pet');
    const vet = vetEntrada === undefined ? atual.veterinario_nome : texto(vetEntrada, 120, 'Veterinário');
    const prio = p.prioridade === undefined ? atual.prioridade : p.prioridade;
    const mot = motEntrada === undefined ? atual.motivo_resumido : texto(motEntrada, 300, 'Motivo');
    const sala = salaEntrada === undefined ? atual.sala_id : (salaEntrada || null);
    const srv = srvEntrada === undefined ? atual.servico_id : srvEntrada;

    db.prepare(
      `update fila_itens
          set tutor_nome = ?, pet_nome = ?, veterinario_nome = ?, prioridade = ?,
              motivo_resumido = ?, sala_id = ?, servico_id = ?, updated_at = ?
        where id = ?`,
    ).run(tutor, pet, vet, prio, mot, sala, srv, agora(), id);

    return item(db.prepare('select * from fila_itens where id = ?').get(id));
  }, { imediata: true });
}

// "Chamar Próximo" atômico: Emergência > Preferencial > Normal, depois por ordem de chegada.
// Duas veterinárias clicando ao mesmo tempo nunca chamam o mesmo paciente.
export function chamarProximo(salaId, { veterinarioNome } = {}) {
  return transacao(
    () => {
      const s = db.prepare('select * from fila_salas where id = ? and ativa = 1').get(salaId);
      if (!s) throw new HttpError(400, 'Sala inexistente ou desativada.');
      const proximo = db
        .prepare(
          `select id from fila_itens
            where status = 'aguardando' and (sala_id is null or sala_id = ?)
            order by ${ORDEM_PRIORIDADE}, chegada_em asc limit 1`,
        )
        .get(salaId);
      if (!proximo) throw new HttpError(404, 'Nenhum paciente aguardando na fila no momento.');
      return aplicarAcao(proximo.id, 'chamar', { salaId, veterinarioNome });
    },
    { imediata: true },
  );
}

// ---------- carga inicial (serviços e salas padrão, só na primeira execução) ----------

/** Devolve true na primeira execução (banco novo): quem chama aproveita para carregar o vídeo padrão. */
export function carregarPadroes() {
  const vazio = (t) => db.prepare(`select count(*) as n from ${t}`).get().n === 0;
  const primeiraVez = vazio('fila_servicos');
  transacao(() => {
    if (primeiraVez) {
      const ins = db.prepare('insert into fila_servicos (id, nome, prefixo, ordem, created_at) values (?, ?, ?, ?, ?)');
      [
        ['Emergência', 'X'],
        ['Consulta Clínica', 'A'],
        ['Retorno', 'B'],
        ['Vacinação / Imunização', 'C'],
        ['Exames Laboratoriais / Imagem', 'E'],
        ['Cirurgia / Pré-operatório', 'S'],
        ['Especialidades', 'P'],
      ].forEach(([nome, prefixo], i) => ins.run(randomUUID(), nome, prefixo, i, agora()));
    }
    if (vazio('fila_salas')) {
      const ins = db.prepare('insert into fila_salas (id, nome, created_at) values (?, ?, ?)');
      [
        'Consultório 01', 'Consultório 02', 'Consultório 03', 'Sala de Vacinas',
        'Sala de Procedimentos', 'Ultrassom / Raio-X', 'Recepção / Triagem',
      ].forEach((nome) => ins.run(randomUUID(), nome, agora()));
    }
    if (vazio('fila_veterinarios')) {
      const ins = db.prepare('insert into fila_veterinarios (id, nome, ordem, created_at) values (?, ?, ?, ?)');
      ['Dra. Camila', 'Dr. Rafael', 'Dra. Helena'].forEach((nome, i) =>
        ins.run(randomUUID(), nome, i, agora()),
      );
    }
  });
  return primeiraVez;
}

export { ATIVOS };
