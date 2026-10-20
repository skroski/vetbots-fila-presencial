// Tipos de Domínio do Sistema de Fila Presencial Veterinária

export type QueuePriority = 'normal' | 'prioridade' | 'emergencia';
export type QueueStatus = 'aguardando' | 'chamado' | 'em_atendimento' | 'finalizado' | 'ausente' | 'cancelado';

export interface QueueService {
  id: string;
  nome: string;
  prefixo: string;
  ativo: boolean;
  ordem: number;
}

export interface QueueRoom {
  id: string;
  nome: string;
  ativa: boolean;
}

export interface TransferRecord {
  data: string;
  usuario_id?: string | null;
  sala_origem?: string | null;
  sala_destino?: string | null;
  servico_origem?: string | null;
  servico_destino?: string | null;
  motivo?: string | null;
}

export interface QueueItem {
  id: string;
  senha: string;
  servico_id: string;
  sala_id: string | null;
  tutor_nome: string;
  pet_nome: string | null;
  veterinario_nome: string | null;
  prioridade: QueuePriority;
  status: QueueStatus;
  motivo_resumido?: string | null;
  chegada_em: string;
  chamado_em?: string | null;
  iniciado_em?: string | null;
  finalizado_em?: string | null;
  ausente_em?: string | null;
  cancelado_em?: string | null;
  historico_transferencias: TransferRecord[];
  servico?: QueueService;
  sala?: QueueRoom;
}

export interface QueueTvItem {
  senha: string;
  pet_nome: string | null;
  veterinario_nome: string | null;
  sala: string | null;
  status: string;
  chamado_em: string | null;
}

export interface RoomCallerData {
  sala: QueueRoom | null;
  salas: QueueRoom[];
  atual: {
    id: string;
    ticket: string;
    tutorName: string;
    petName: string | null;
    veterinarianName: string | null;
    priority: QueuePriority;
    status: QueueStatus;
    arrivedAt: string;
    calledAt?: string | null;
    startedAt?: string | null;
    roomId?: string | null;
    roomName?: string | null;
    serviceName?: string | null;
  } | null;
  proximos: Array<{
    id: string;
    ticket: string;
    tutorName: string;
    petName: string | null;
    veterinarianName: string | null;
    priority: QueuePriority;
    status: QueueStatus;
    arrivedAt: string;
    calledAt?: string | null;
    startedAt?: string | null;
    roomId?: string | null;
    roomName?: string | null;
    serviceName?: string | null;
  }>;
}

export const QUEUE_STATUS_LABEL: Record<QueueStatus, string> = {
  aguardando: 'Aguardando',
  chamado: 'Chamado',
  em_atendimento: 'Em Atendimento',
  finalizado: 'Finalizado',
  ausente: 'Não Compareceu',
  cancelado: 'Cancelado',
};

export const QUEUE_PRIORITY_LABEL: Record<QueuePriority, string> = {
  normal: 'Normal',
  prioridade: 'Preferencial (Lei 10.048)',
  emergencia: 'Urgente / Emergência',
};

export const PRIORITY_STYLES: Record<QueuePriority, { badge: string; border: string; bg: string }> = {
  emergencia: {
    badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse',
    border: 'border-l-4 border-l-rose-500',
    bg: 'bg-rose-500/5',
  },
  prioridade: {
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    border: 'border-l-4 border-l-amber-500',
    bg: 'bg-amber-500/5',
  },
  normal: {
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    border: 'border-l-4 border-l-brand-500',
    bg: 'bg-transparent',
  },
};


export interface Media {
  id: string;
  nome: string;
  arquivo: string;
  url: string;
  tamanho: number;
  ordem: number;
  ativo: boolean;
}

/** Aparência e opções editáveis em /config (guardadas no SQLite). */
export interface AppConfig {
  clinic_name: string;
  clinic_subtitle: string;
  brand_color: string;
  logo_url: string | null;
  tv_sound: boolean;
  tv_privacy: boolean;
  tv_layout: 'lateral' | 'tela_cheia';
  tv_video_muted: boolean;
  tv_overlay_seconds: number;
  ticket_footer: string;
  ticket_show_logo: boolean;
  ticket_width_mm: '58' | '80';
  reset_daily: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  clinic_name: 'Clínica Veterinária',
  clinic_subtitle: 'Painel de Atendimento Presencial',
  brand_color: '#10b981',
  logo_url: null,
  tv_sound: true,
  tv_privacy: false,
  tv_layout: 'lateral',
  tv_video_muted: true,
  tv_overlay_seconds: 12,
  ticket_footer: 'Acompanhe pelo telão da sala de espera.',
  ticket_show_logo: true,
  ticket_width_mm: '58',
  reset_daily: true,
};
