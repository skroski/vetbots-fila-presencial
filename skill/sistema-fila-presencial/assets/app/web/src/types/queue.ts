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

export interface QueueVeterinarian {
  id: string;
  nome: string;
  crmv: string | null;
  ativo: boolean;
  ordem: number;
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

// badge: classes do daisyUI (.badge-soft-* vêm de index.css); border/bg: realce do cartão na fila
export const PRIORITY_STYLES: Record<QueuePriority, { badge: string; border: string; bg: string }> = {
  emergencia: {
    badge: 'badge badge-soft-error h-auto py-0.5 animate-pulse',
    border: 'border-l-4 border-l-error',
    bg: 'bg-error/5',
  },
  prioridade: {
    badge: 'badge badge-soft-warning h-auto py-0.5',
    border: 'border-l-4 border-l-warning',
    bg: 'bg-warning/5',
  },
  normal: {
    badge: 'badge badge-soft-neutral h-auto py-0.5',
    border: 'border-l-4 border-l-primary',
    bg: 'bg-transparent',
  },
};


export interface Media {
  id: string;
  nome: string;
  /** 'arquivo' = MP4 enviado (toca da rede local); 'youtube' = player do YouTube (precisa de internet na TV) */
  tipo: 'arquivo' | 'youtube';
  youtube_id: string | null;
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
  /** Mostra nome e subtítulo ao lado do logotipo (recepção e TV); por padrão aparece só o logotipo */
  show_brand_text: boolean;
  logo_url: string | null;
  tv_sound: boolean;
  tv_privacy: boolean;
  tv_layout: 'lateral' | 'tela_cheia' | 'video_16_9';
  tv_theme: 'dark' | 'light';
  /** Parte da largura da tela ocupada pelo vídeo no layout "TV menor" */
  tv_video_size: '1_3' | '1_2' | '2_3';
  /** No layout "TV menor": mostrar também chamadas anteriores e próximos (desligado = só a chamada atual) */
  tv_show_lists: boolean;
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
  brand_color: '#2294aa',
  show_brand_text: false,
  logo_url: null,
  tv_sound: true,
  tv_privacy: false,
  tv_layout: 'video_16_9',
  tv_theme: 'dark',
  tv_video_size: '1_3',
  tv_show_lists: true,
  tv_video_muted: true,
  tv_overlay_seconds: 12,
  ticket_footer: 'Acompanhe pelo telão da sala de espera.',
  ticket_show_logo: true,
  ticket_width_mm: '58',
  reset_daily: true,
};

export interface BackupInfo {
  arquivo: string;
  tamanho: number;
  criado_em: string;
  tipo: 'auto' | 'manual' | 'pre-restauracao' | string;
}

export interface PersistenceStats {
  tamanhoBancoBytes: number;
  totalItens: number;
  totalAtivos: number;
  totalSalas: number;
  totalServicos: number;
  totalVeterinarios: number;
  totalBackups: number;
  ultimoBackup: string | null;
  caminhoBanco: string;
}

export interface ExportDataJson {
  versao: number;
  sistema: string;
  exportado_em: string;
  config: AppConfig;
  servicos: QueueService[];
  salas: QueueRoom[];
  veterinarios: QueueVeterinarian[];
  itens?: QueueItem[];
  chamadas?: Array<{ id: string; item_id: string; sala_id: string | null; created_at: string }>;
}

export interface ImportResult {
  ok: boolean;
  mensagem: string;
  detalhes?: {
    configAtualizada?: boolean;
    servicosImportados?: number;
    salasImportadas?: number;
    veterinariosImportados?: number;
    itensImportados?: number;
  };
}

