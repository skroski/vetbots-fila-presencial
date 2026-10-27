// Modo demonstração (vite build --mode demo): o servidor Node/SQLite é substituído por uma API simulada
// que roda no próprio navegador. Reproduz as regras de web/../server/queue.js (numeração das senhas,
// prioridade Emergência > Preferencial > Normal, transferências) e o contrato de server/app.js.
//
// - Os dados ficam no localStorage deste navegador; abas abertas (recepção, TV, consultório) se
//   sincronizam por BroadcastChannel, como o SSE faz no servidor real.
// - Envio de logo/vídeos e backup ficam desativados.
// - Nada sai do navegador: não há servidor, banco nem rede.
import { DEFAULT_CONFIG } from '@/types/queue';
import type { AppConfig, QueueItem, QueuePriority, QueueRoom, QueueService, QueueVeterinarian } from '@/types/queue';

const CHAVE = 'fila-demo-v1';
const CANAL = 'fila-demo';
const VALIDADE_MS = 12 * 3600 * 1000; // dados de demonstração mais velhos que isso são regerados
const DIAS_HISTORICO = 30;

type Item = QueueItem & { ciclo: string };

interface Estado {
  criadoEm: number;
  servicos: QueueService[];
  salas: QueueRoom[];
  veterinarios: QueueVeterinarian[];
  itens: Item[];
  config: AppConfig;
}

class ErroHttp extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// ---------- utilidades ----------

const agora = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
const pad = (n: number) => String(n).padStart(2, '0');
const diaLocal = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ATIVOS = ['aguardando', 'chamado', 'em_atendimento'];
const PRIORIDADES = ['normal', 'prioridade', 'emergencia'];
const ACOES = ['chamar', 'iniciar', 'finalizar', 'ausente', 'retornar', 'cancelar', 'transferir'];
const ORDEM_PRIORIDADE: Record<string, number> = { emergencia: 0, prioridade: 1, normal: 2 };

function texto(v: unknown, max: number, rotulo: string, obrigatorio = false): string | null {
  const t = typeof v === 'string' ? v.trim() : '';
  if (obrigatorio && !t) throw new ErroHttp(400, `${rotulo} é obrigatório.`);
  return t ? t.slice(0, max) : null;
}

// Gerador pseudoaleatório fixo: o histórico de exemplo é sempre o mesmo.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- dados iniciais ----------

function semear(): Estado {
  const servicos: QueueService[] = [
    ['Emergência', 'X'],
    ['Consulta Clínica', 'A'],
    ['Retorno', 'B'],
    ['Vacinação / Imunização', 'C'],
    ['Exames Laboratoriais / Imagem', 'E'],
    ['Cirurgia / Pré-operatório', 'S'],
    ['Especialidades', 'P'],
  ].map(([nome, prefixo], i) => ({ id: `srv-${prefixo.toLowerCase()}`, nome, prefixo, ativo: true, ordem: i }));
  const salas: QueueRoom[] = [
    'Consultório 01',
    'Consultório 02',
    'Consultório 03',
    'Sala de Vacinas',
    'Sala de Procedimentos',
    'Ultrassom / Raio-X',
    'Recepção / Triagem',
  ].map((nome, i) => ({ id: `sala-${i + 1}`, nome, ativa: true }));

  const rnd = mulberry32(2026);
  const escolha = <T,>(l: T[]) => l[Math.floor(rnd() * l.length)];
  const tutores = ['Mariana Souza', 'Carlos Lima', 'Paula Ribeiro', 'Ana Beatriz', 'Roberto Alves', 'Juliana Prado', 'Fernando Dias', 'Camila Torres', 'Lucas Martins', 'Patrícia Gomes'];
  const pets = ['Thor', 'Luna', 'Bolinha', 'Mel', 'Rex', 'Nina', 'Pipoca', 'Fred', 'Mia', 'Bob', 'Amora', 'Simba'];
  const vets = ['Dra. Camila', 'Dr. Rafael', 'Dra. Helena'];
  const prefixos = ['A', 'A', 'A', 'B', 'C', 'C', 'E', 'S', 'P', 'X'];
  const porPrefixo = (p: string) => servicos.find((s) => s.prefixo === p)!;
  const contador = new Map<string, number>(); // ciclo + prefixo -> último número

  const novoItem = (
    chegada: Date,
    prefixo: string,
    prioridade: QueuePriority,
    ciclo: string,
    extra: Partial<Item> = {},
  ): Item => {
    const chave = ciclo + prefixo;
    const n = (contador.get(chave) ?? 0) + 1;
    contador.set(chave, n);
    const iso = chegada.toISOString();
    return {
      id: uuid(),
      senha: `${prefixo}${String(n).padStart(3, '0')}`,
      ciclo,
      servico_id: porPrefixo(prefixo).id,
      sala_id: null,
      tutor_nome: escolha(tutores),
      pet_nome: escolha(pets),
      veterinario_nome: escolha(vets),
      prioridade,
      status: 'aguardando',
      motivo_resumido: null,
      chegada_em: iso,
      chamado_em: null,
      iniciado_em: null,
      finalizado_em: null,
      ausente_em: null,
      cancelado_em: null,
      historico_transferencias: [],
      ...extra,
    } as Item;
  };

  const itens: Item[] = [];
  const min = 60000;
  const agoraMs = Date.now();

  // Histórico dos últimos dias (alimenta as métricas)
  for (let dia = DIAS_HISTORICO - 1; dia >= 1; dia--) {
    const base = new Date(agoraMs - dia * 86400000);
    if (base.getDay() === 0) continue; // domingo fechado
    const ciclo = diaLocal(base);
    const total = 8 + Math.floor(rnd() * 8);
    let hora = 8 * 60 + Math.floor(rnd() * 20);
    for (let i = 0; i < total; i++) {
      hora += 8 + Math.floor(rnd() * 22);
      const chegada = new Date(base);
      chegada.setHours(0, 0, 0, 0);
      chegada.setTime(chegada.getTime() + hora * min);
      const r = rnd();
      const prioridade: QueuePriority = r < 0.08 ? 'emergencia' : r < 0.22 ? 'prioridade' : 'normal';
      const prefixo = prioridade === 'emergencia' ? 'X' : escolha(prefixos.filter((p) => p !== 'X'));
      const espera = (prioridade === 'emergencia' ? 2 : 6) + Math.floor(rnd() * 30);
      const duracao = 12 + Math.floor(rnd() * 35);
      const chamado = new Date(chegada.getTime() + espera * min);
      const sala = escolha(salas.slice(0, 6));
      if (rnd() < 0.07) {
        itens.push(
          novoItem(chegada, prefixo, prioridade, ciclo, {
            status: 'ausente',
            sala_id: sala.id,
            chamado_em: chamado.toISOString(),
            ausente_em: new Date(chamado.getTime() + 4 * min).toISOString(),
          }),
        );
        continue;
      }
      const inicio = new Date(chamado.getTime() + 1 * min);
      itens.push(
        novoItem(chegada, prefixo, prioridade, ciclo, {
          status: 'finalizado',
          sala_id: sala.id,
          chamado_em: chamado.toISOString(),
          iniciado_em: inicio.toISOString(),
          finalizado_em: new Date(inicio.getTime() + duracao * min).toISOString(),
        }),
      );
    }
  }

  // Hoje: alguns atendimentos já encerrados, um em atendimento, um chamado e a fila aguardando
  const hoje = diaLocal();
  const dh = (m: number) => new Date(agoraMs - m * min);
  const encerrado = (mAtras: number, prefixo: string, sala: QueueRoom) =>
    itens.push(
      novoItem(dh(mAtras), prefixo, 'normal', hoje, {
        status: 'finalizado',
        sala_id: sala.id,
        chamado_em: dh(mAtras - 8).toISOString(),
        iniciado_em: dh(mAtras - 9).toISOString(),
        finalizado_em: dh(mAtras - 30).toISOString(),
      }),
    );
  encerrado(95, 'A', salas[0]);
  encerrado(80, 'C', salas[3]);
  encerrado(70, 'A', salas[1]);

  itens.push(
    novoItem(dh(42), 'A', 'normal', hoje, {
      tutor_nome: 'Mariana Souza',
      pet_nome: 'Thor',
      status: 'em_atendimento',
      sala_id: salas[0].id,
      chamado_em: dh(22).toISOString(),
      iniciado_em: dh(20).toISOString(),
    }),
    novoItem(dh(30), 'B', 'normal', hoje, {
      tutor_nome: 'Carlos Lima',
      pet_nome: 'Luna',
      status: 'chamado',
      sala_id: salas[1].id,
      chamado_em: dh(1).toISOString(),
    }),
  );
  [
    [26, 'A', 'normal', 'Paula Ribeiro', 'Bolinha'],
    [21, 'C', 'normal', 'Ana Beatriz', 'Mel'],
    [17, 'B', 'prioridade', 'Dona Lúcia (Preferencial)', 'Pipoca'],
    [12, 'X', 'emergencia', 'Roberto Alves', 'Rex'],
    [9, 'E', 'normal', 'Juliana Prado', 'Nina'],
    [4, 'A', 'normal', 'Fernando Dias', 'Fred'],
  ].forEach(([m, p, prio, tutor, pet]) =>
    itens.push(novoItem(dh(m as number), p as string, prio as QueuePriority, hoje, { tutor_nome: tutor as string, pet_nome: pet as string })),
  );

  const veterinarios: QueueVeterinarian[] = [
    { id: 'vet-1', nome: 'Dra. Camila', crmv: 'CRMV-SP 12345', ativo: true, ordem: 0 },
    { id: 'vet-2', nome: 'Dr. Rafael', crmv: 'CRMV-SP 23456', ativo: true, ordem: 1 },
    { id: 'vet-3', nome: 'Dra. Helena', crmv: 'CRMV-SP 34567', ativo: true, ordem: 2 },
  ];

  itens.sort((a, b) => a.chegada_em.localeCompare(b.chegada_em));
  return {
    criadoEm: Date.now(),
    servicos,
    salas,
    veterinarios,
    itens,
    config: { ...DEFAULT_CONFIG, clinic_name: 'Clínica Veterinária Exemplo', clinic_subtitle: 'Demonstração do Painel de Atendimento' },
  };
}

// ---------- persistência (localStorage, com cópia em memória se o navegador bloquear) ----------

let memoria: Estado | null = null;

function ler(): Estado {
  let e: Estado | null = null;
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) e = JSON.parse(bruto) as Estado;
  } catch {
    e = memoria;
  }
  e = e ?? memoria;
  if (!e || Date.now() - e.criadoEm > VALIDADE_MS) {
    e = semear();
    gravar(e);
  }
  return e;
}

function gravar(e: Estado) {
  memoria = e;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(e));
  } catch {
    /* sem armazenamento: a demonstração segue só em memória nesta aba */
  }
}

// ---------- tempo real (equivalente ao SSE) ----------

const ouvintes = new Set<DemoEventSource>();
let canal: BroadcastChannel | null = null;

// Criado só em instalarDemo(): importar este módulo nunca tem efeito colateral.
function abrirCanal() {
  try {
    canal = new BroadcastChannel(CANAL);
    canal.onmessage = () => ouvintes.forEach((o) => o.avisar());
  } catch {
    /* sem BroadcastChannel: cada aba atualiza pelo polling de 10 s */
  }
}

function emitir() {
  ouvintes.forEach((o) => o.avisar());
  canal?.postMessage('changed');
}

class DemoEventSource extends EventTarget {
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 1;
  constructor(public url: string) {
    super();
    ouvintes.add(this);
    setTimeout(() => this.onopen?.(), 0);
  }
  avisar() {
    this.dispatchEvent(new Event('changed'));
  }
  close() {
    this.readyState = 2;
    ouvintes.delete(this);
  }
}

// ---------- regras da fila (espelham server/queue.js) ----------

function configPublica(e: Estado) {
  return { ...e.config, logo_url: null };
}

function adicionarItem(e: Estado, p: Record<string, unknown>): Item {
  const tutor = texto(p.tutorNome, 120, 'Nome do tutor', true)!;
  const prioridade = (p.prioridade ?? 'normal') as QueuePriority;
  if (!PRIORIDADES.includes(prioridade)) throw new ErroHttp(400, 'Prioridade inválida.');
  const srv = e.servicos.find((s) => s.id === p.servicoId && s.ativo);
  if (!srv) throw new ErroHttp(400, 'Serviço indisponível.');
  if (p.salaId && !e.salas.some((s) => s.id === p.salaId)) throw new ErroHttp(400, 'Sala inexistente.');

  const ciclo = e.config.reset_daily ? diaLocal() : 'continuo';
  // Como no servidor: itens ainda ativos de outros dias entram na conta, para nunca repetir uma senha ativa.
  const max = e.itens
    .filter((i) => i.senha.startsWith(srv.prefixo) && /^\d+$/.test(i.senha.slice(srv.prefixo.length)))
    .filter((i) => i.ciclo === ciclo || ATIVOS.includes(i.status))
    .reduce((m, i) => Math.max(m, Number(i.senha.slice(srv.prefixo.length))), 0);
  const t = agora();
  const novo: Item = {
    id: uuid(),
    senha: `${srv.prefixo}${String(max + 1).padStart(3, '0')}`,
    ciclo,
    servico_id: srv.id,
    sala_id: (p.salaId as string) || null,
    tutor_nome: tutor,
    pet_nome: texto(p.petNome, 120, 'Pet'),
    veterinario_nome: texto(p.veterinarioNome, 120, 'Veterinário'),
    prioridade,
    status: 'aguardando',
    motivo_resumido: texto(p.motivoResumido, 300, 'Motivo'),
    chegada_em: t,
    chamado_em: null,
    iniciado_em: null,
    finalizado_em: null,
    ausente_em: null,
    cancelado_em: null,
    historico_transferencias: [],
  };
  e.itens.push(novo);
  return novo;
}

function aplicarAcao(
  e: Estado,
  id: string,
  acao: string,
  { salaId, novoServicoId, motivo, veterinarioNome }: { salaId?: string; novoServicoId?: string; motivo?: string; veterinarioNome?: string } = {},
): Item {
  if (!ACOES.includes(acao)) throw new ErroHttp(400, 'Ação de fila inválida.');
  const it = e.itens.find((i) => i.id === id);
  if (!it) throw new ErroHttp(404, 'Item da fila não encontrado.');
  if (['finalizado', 'cancelado'].includes(it.status)) throw new ErroHttp(409, 'Este atendimento já foi encerrado.');
  if (salaId && !e.salas.some((s) => s.id === salaId)) throw new ErroHttp(400, 'Sala inexistente.');
  if (novoServicoId && !e.servicos.some((s) => s.id === novoServicoId)) throw new ErroHttp(400, 'Serviço inexistente.');

  const t = agora();
  if (veterinarioNome !== undefined) {
    it.veterinario_nome = texto(veterinarioNome, 120, 'Veterinário');
  }
  switch (acao) {
    case 'chamar':
      it.status = 'chamado';
      it.chamado_em = t;
      if (salaId) it.sala_id = salaId;
      break;
    case 'iniciar':
      it.status = 'em_atendimento';
      it.iniciado_em = t;
      if (salaId) it.sala_id = salaId;
      break;
    case 'finalizar':
      it.status = 'finalizado';
      it.finalizado_em = t;
      break;
    case 'ausente':
      it.status = 'ausente';
      it.ausente_em = t;
      break;
    case 'retornar':
      it.status = 'aguardando';
      it.chamado_em = null;
      break;
    case 'cancelar':
      it.status = 'cancelado';
      it.cancelado_em = t;
      break;
    case 'transferir':
      // Mantém o status e o horário de chegada (não perde a vez na fila).
      it.historico_transferencias.push({
        data: t,
        sala_origem: it.sala_id,
        sala_destino: salaId || it.sala_id,
        servico_origem: it.servico_id,
        servico_destino: novoServicoId || it.servico_id,
        motivo: texto(motivo, 300, 'Motivo'),
      });
      if (salaId) it.sala_id = salaId;
      if (novoServicoId) it.servico_id = novoServicoId;
      break;
  }
  return it;
}

function chamarProximo(e: Estado, salaId: string, extra?: { veterinarioNome?: string }): Item {
  const sala = e.salas.find((s) => s.id === salaId && s.ativa);
  if (!sala) throw new ErroHttp(400, 'Sala inexistente ou desativada.');
  const proximo = e.itens
    .filter((i) => i.status === 'aguardando' && (!i.sala_id || i.sala_id === salaId))
    .sort((a, b) => ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade] || a.chegada_em.localeCompare(b.chegada_em))[0];
  if (!proximo) throw new ErroHttp(404, 'Nenhum paciente aguardando na fila no momento.');
  return aplicarAcao(e, proximo.id, 'chamar', { salaId, veterinarioNome: extra?.veterinarioNome });
}

const prefixoValido = (p: unknown) => {
  const v = String(p ?? '').trim().toUpperCase();
  if (!/^[A-Z]{1,2}$/.test(v)) throw new ErroHttp(400, 'O prefixo deve ter 1 ou 2 letras (A-Z).');
  return v;
};

function validarConfig(e: Estado, parcial: Record<string, unknown>) {
  const cfg = e.config as unknown as Record<string, unknown>;
  const tipos: Record<string, 'texto' | 'bool' | 'int' | 'cor' | string[]> = {
    clinic_name: 'texto', clinic_subtitle: 'texto', brand_color: 'cor', show_brand_text: 'bool', tv_sound: 'bool', tv_privacy: 'bool',
    tv_layout: ['lateral', 'tela_cheia', 'video_16_9'], tv_theme: ['dark', 'light'], tv_video_size: ['1_3', '1_2', '2_3'], tv_show_lists: 'bool', tv_video_muted: 'bool', tv_overlay_seconds: 'int',
    ticket_footer: 'texto', ticket_show_logo: 'bool', ticket_width_mm: ['58', '80'], reset_daily: 'bool',
  };
  for (const [chave, valor] of Object.entries(parcial)) {
    const tipo = tipos[chave];
    if (!tipo) continue;
    if (tipo === 'texto') {
      const t = String(valor ?? '').trim().slice(0, chave === 'ticket_footer' ? 120 : 80);
      if (chave === 'clinic_name' && !t) throw new ErroHttp(400, 'Informe o nome da clínica.');
      cfg[chave] = t;
    } else if (tipo === 'bool') {
      cfg[chave] = valor === true || valor === 'true';
    } else if (tipo === 'int') {
      const n = Number.parseInt(String(valor), 10);
      if (!Number.isFinite(n)) throw new ErroHttp(400, `Valor inválido para ${chave}.`);
      cfg[chave] = Math.min(60, Math.max(4, n));
    } else if (tipo === 'cor') {
      if (!/^#[0-9a-fA-F]{6}$/.test(String(valor))) throw new ErroHttp(400, 'Cor inválida (use #RRGGBB).');
      cfg[chave] = String(valor).toLowerCase();
    } else {
      if (!tipo.includes(String(valor))) throw new ErroHttp(400, `Valor inválido para ${chave}.`);
      cfg[chave] = String(valor);
    }
  }
}

// ---------- rotas (espelham server/app.js) ----------

type Corpo = Record<string, unknown>;
type Resposta = { status?: number; corpo?: unknown; mudou?: boolean };

const INDISPONIVEL = 'Indisponível na demonstração. Na instalação real este recurso funciona normalmente.';

function rotear(metodo: string, caminho: string, corpo: Corpo, e: Estado): Resposta {
  let m: RegExpMatchArray | null;
  const rota = (re: RegExp) => (m = caminho.match(re));

  if (metodo === 'GET') {
    if (caminho === '/api/state') {
      const corte = new Date(Date.now() - DIAS_HISTORICO * 86400000).toISOString();
      return {
        corpo: {
          servicos: [...e.servicos].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)),
          salas: [...e.salas].sort((a, b) => a.nome.localeCompare(b.nome)),
          veterinarios: [...(e.veterinarios || [])].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)),
          itens: e.itens.filter((i) => ATIVOS.includes(i.status) || i.chegada_em >= corte),
          midias: [],
          config: configPublica(e),
          horaServidor: agora(),
        },
      };
    }
    if (caminho === '/api/config') return { corpo: configPublica(e) };
    if (caminho === '/api/health') return { corpo: { ok: true, hora: agora() } };
    if (caminho === '/api/info') return { corpo: { ips: [], hostname: 'clinica.local', porta: 0, versao: 'demo' } };
    if (caminho === '/api/auth') return { corpo: { pinRequired: false } };
    if (caminho === '/api/dados/estatisticas') {
      return {
        corpo: {
          tamanhoBancoBytes: 49152,
          totalItens: e.itens.length,
          totalAtivos: e.itens.filter((i) => ATIVOS.includes(i.status)).length,
          totalSalas: e.salas.length,
          totalServicos: e.servicos.length,
          totalVeterinarios: (e.veterinarios || []).length,
          totalBackups: 1,
          ultimoBackup: agora(),
          caminhoBanco: 'localStorage (Modo Demonstração)',
        },
      };
    }
    if (caminho === '/api/backups') {
      return {
        corpo: [
          {
            arquivo: `auto-${diaLocal()}.db`,
            tamanho: 49152,
            criado_em: agora(),
            tipo: 'auto',
          },
        ],
      };
    }
    if (caminho === '/api/dados/exportar') {
      return {
        corpo: {
          versao: 1,
          sistema: 'vetbots-fila-presencial',
          exportado_em: agora(),
          config: configPublica(e),
          servicos: e.servicos,
          salas: e.salas,
          veterinarios: e.veterinarios || [],
          itens: e.itens,
          chamadas: [],
        },
      };
    }
    if (caminho === '/api/backup') throw new ErroHttp(403, INDISPONIVEL);
  }

  if (metodo === 'POST') {
    if (caminho === '/api/auth/verificar') return { corpo: { ok: true } };
    if (caminho === '/api/backups') {
      return {
        status: 201,
        corpo: {
          arquivo: `manual-${diaLocal()}-demo.db`,
          tamanho: 49152,
          criado_em: agora(),
          tipo: 'manual',
        },
      };
    }
    if (caminho === '/api/backups/restaurar') {
      return { corpo: { ok: true, arquivo: (corpo as Record<string, string>)?.arquivo || 'demo.db' }, mudou: true };
    }
    if (caminho === '/api/dados/importar') {
      const d = ((corpo as Record<string, unknown>)?.dados || corpo) as Record<string, unknown>;
      if (d.config && typeof d.config === 'object') Object.assign(e.config, d.config);
      if (Array.isArray(d.servicos)) e.servicos = d.servicos as QueueService[];
      if (Array.isArray(d.salas)) e.salas = d.salas as QueueRoom[];
      if (Array.isArray(d.veterinarios)) e.veterinarios = d.veterinarios as QueueVeterinarian[];
      if (Array.isArray(d.itens)) e.itens = d.itens as Item[];
      return { corpo: { ok: true, mensagem: 'Dados importados na demonstração.' }, mudou: true };
    }
    if (caminho === '/api/itens') return { status: 201, corpo: adicionarItem(e, corpo), mudou: true };
    if (rota(/^\/api\/itens\/([^/]+)\/acao$/)) {
      const { acao, salaId, novoServicoId, motivo, veterinarioNome } = corpo as Record<string, string>;
      return { corpo: aplicarAcao(e, m![1], acao, { salaId, novoServicoId, motivo, veterinarioNome }), mudou: true };
    }
    if (rota(/^\/api\/salas\/([^/]+)\/chamar-proximo$/)) {
      const { veterinarioNome } = corpo as Record<string, string>;
      return { corpo: chamarProximo(e, m![1], { veterinarioNome }), mudou: true };
    }
    if (caminho === '/api/salas') {
      const nome = texto(corpo.nome, 60, 'Nome da sala', true)!;
      if (e.salas.some((s) => s.nome.toLowerCase() === nome.toLowerCase())) throw new ErroHttp(409, 'Já existe uma sala com esse nome.');
      const sala = { id: uuid(), nome, ativa: true };
      e.salas.push(sala);
      return { status: 201, corpo: sala, mudou: true };
    }
    if (caminho === '/api/servicos') {
      const nome = texto(corpo.nome, 60, 'Nome do serviço', true)!;
      const prefixo = prefixoValido(corpo.prefixo);
      if (e.servicos.some((s) => s.nome.toLowerCase() === nome.toLowerCase())) throw new ErroHttp(409, 'Já existe um serviço com esse nome.');
      const srv = { id: uuid(), nome, prefixo, ativo: true, ordem: e.servicos.reduce((o, s) => Math.max(o, s.ordem), -1) + 1 };
      e.servicos.push(srv);
      return { status: 201, corpo: srv, mudou: true };
    }
    if (caminho === '/api/veterinarios') {
      const nome = texto(corpo.nome, 80, 'Nome do veterinário', true)!;
      const crmv = corpo.crmv ? texto(corpo.crmv, 30, 'CRMV') : null;
      if (!e.veterinarios) e.veterinarios = [];
      const vet: QueueVeterinarian = {
        id: uuid(),
        nome,
        crmv,
        ativo: true,
        ordem: e.veterinarios.reduce((o, v) => Math.max(o, v.ordem), -1) + 1,
      };
      e.veterinarios.push(vet);
      return { status: 201, corpo: vet, mudou: true };
    }
    if (caminho === '/api/midias/ordem' || caminho === '/api/midias/youtube') throw new ErroHttp(403, INDISPONIVEL);
  }

  if (metodo === 'PATCH') {
    if (rota(/^\/api\/itens\/([^/]+)$/)) {
      const it = e.itens.find((i) => i.id === m![1]);
      if (!it) throw new ErroHttp(404, 'Senha não encontrada.');
      if (corpo.tutor_nome !== undefined) it.tutor_nome = texto(corpo.tutor_nome, 80, 'Nome do tutor', true)!;
      if (corpo.pet_nome !== undefined) it.pet_nome = texto(corpo.pet_nome, 50, 'Nome do pet');
      if (corpo.veterinario_nome !== undefined) it.veterinario_nome = texto(corpo.veterinario_nome, 80, 'Nome do veterinário');
      if (corpo.motivo_resumido !== undefined) it.motivo_resumido = texto(corpo.motivo_resumido, 200, 'Motivo');
      if (corpo.prioridade !== undefined && ['normal', 'prioridade', 'emergencia'].includes(String(corpo.prioridade))) {
        it.prioridade = corpo.prioridade as QueuePriority;
      }
      if (corpo.servico_id !== undefined) {
        if (!e.servicos.some((s) => s.id === corpo.servico_id)) throw new ErroHttp(400, 'Serviço inexistente.');
        it.servico_id = String(corpo.servico_id);
      }
      if (corpo.sala_id !== undefined) {
        if (corpo.sala_id && !e.salas.some((s) => s.id === corpo.sala_id)) throw new ErroHttp(400, 'Sala inexistente.');
        it.sala_id = (corpo.sala_id as string) || null;
      }
      return { corpo: it, mudou: true };
    }
    if (rota(/^\/api\/salas\/([^/]+)$/)) {
      const sala = e.salas.find((s) => s.id === m![1]);
      if (!sala) throw new ErroHttp(404, 'Sala não encontrada.');
      if (corpo.nome !== undefined) {
        const nome = texto(corpo.nome, 60, 'Nome da sala', true)!;
        if (e.salas.some((s) => s.id !== sala.id && s.nome.toLowerCase() === nome.toLowerCase())) throw new ErroHttp(409, 'Já existe uma sala com esse nome.');
        sala.nome = nome;
      }
      if (corpo.ativa !== undefined) sala.ativa = !!corpo.ativa;
      return { corpo: sala, mudou: true };
    }
    if (rota(/^\/api\/servicos\/([^/]+)$/)) {
      const srv = e.servicos.find((s) => s.id === m![1]);
      if (!srv) throw new ErroHttp(404, 'Serviço não encontrado.');
      if (corpo.nome !== undefined) {
        const nome = texto(corpo.nome, 60, 'Nome do serviço', true)!;
        if (e.servicos.some((s) => s.id !== srv.id && s.nome.toLowerCase() === nome.toLowerCase())) throw new ErroHttp(409, 'Já existe um serviço com esse nome.');
        srv.nome = nome;
      }
      if (corpo.prefixo !== undefined) srv.prefixo = prefixoValido(corpo.prefixo);
      if (corpo.ativo !== undefined) srv.ativo = !!corpo.ativo;
      if (Number.isInteger(corpo.ordem)) srv.ordem = corpo.ordem as number;
      return { corpo: srv, mudou: true };
    }
    if (rota(/^\/api\/veterinarios\/([^/]+)$/)) {
      if (!e.veterinarios) e.veterinarios = [];
      const vet = e.veterinarios.find((v) => v.id === m![1]);
      if (!vet) throw new ErroHttp(404, 'Veterinário não encontrado.');
      if (corpo.nome !== undefined) {
        const nome = texto(corpo.nome, 80, 'Nome do veterinário', true)!;
        vet.nome = nome;
      }
      if (corpo.crmv !== undefined) vet.crmv = corpo.crmv ? texto(corpo.crmv, 30, 'CRMV') : null;
      if (corpo.ativo !== undefined) vet.ativo = !!corpo.ativo;
      if (Number.isInteger(corpo.ordem)) vet.ordem = corpo.ordem as number;
      return { corpo: vet, mudou: true };
    }
    if (rota(/^\/api\/midias\/([^/]+)$/)) throw new ErroHttp(403, INDISPONIVEL);
  }

  if (metodo === 'DELETE') {
    if (rota(/^\/api\/salas\/([^/]+)$/)) {
      if (e.itens.some((i) => i.sala_id === m![1])) throw new ErroHttp(409, 'Esta sala já tem atendimentos no histórico. Desative-a em vez de excluir.');
      const n = e.salas.length;
      e.salas = e.salas.filter((s) => s.id !== m![1]);
      if (e.salas.length === n) throw new ErroHttp(404, 'Sala não encontrada.');
      return { status: 204, mudou: true };
    }
    if (rota(/^\/api\/servicos\/([^/]+)$/)) {
      if (e.itens.some((i) => i.servico_id === m![1])) throw new ErroHttp(409, 'Este serviço já tem atendimentos no histórico. Desative-o em vez de excluir.');
      const n = e.servicos.length;
      e.servicos = e.servicos.filter((s) => s.id !== m![1]);
      if (e.servicos.length === n) throw new ErroHttp(404, 'Serviço não encontrado.');
      return { status: 204, mudou: true };
    }
    if (rota(/^\/api\/veterinarios\/([^/]+)$/)) {
      if (!e.veterinarios) e.veterinarios = [];
      const n = e.veterinarios.length;
      e.veterinarios = e.veterinarios.filter((v) => v.id !== m![1]);
      if (e.veterinarios.length === n) throw new ErroHttp(404, 'Veterinário não encontrado.');
      return { status: 204, mudou: true };
    }
    if (caminho === '/api/logo' || rota(/^\/api\/midias\/([^/]+)$/)) throw new ErroHttp(403, INDISPONIVEL);
  }

  if (metodo === 'PUT') {
    if (caminho === '/api/config') {
      validarConfig(e, corpo);
      return { corpo: configPublica(e), mudou: true };
    }
    if (caminho === '/api/logo' || caminho === '/api/midias') throw new ErroHttp(403, INDISPONIVEL);
  }

  throw new ErroHttp(404, 'Rota não encontrada.');
}

// ---------- instalação ----------

const json = (status: number, corpo?: unknown) =>
  status === 204
    ? new Response(null, { status })
    : new Response(JSON.stringify(corpo ?? {}), { status, headers: { 'content-type': 'application/json' } });

export const reiniciarDemo = () => {
  gravar(semear());
  emitir();
};

export function instalarDemo() {
  abrirCanal();
  const original = window.fetch.bind(window);
  window.fetch = async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.pathname + entrada.search : entrada.url;
    const caminho = url.split('?')[0];
    if (!caminho.startsWith('/api/')) return original(entrada, init);
    const metodo = (init?.method || 'GET').toUpperCase();
    try {
      const corpo = typeof init?.body === 'string' && init.body ? (JSON.parse(init.body) as Corpo) : {};
      const estado = ler();
      const r = rotear(metodo, caminho, corpo, estado);
      if (r.mudou) {
        gravar(estado);
        emitir();
      }
      return json(r.status ?? 200, r.corpo);
    } catch (err) {
      if (err instanceof ErroHttp) return json(err.status, { erro: err.message });
      console.error('[demo]', err);
      return json(500, { erro: 'Erro interno da demonstração.' });
    }
  };
  (window as unknown as { EventSource: unknown }).EventSource = DemoEventSource;
}
