// Estado compartilhado em memória + sincronização em tempo real com o servidor (SSE).
// Cada tela usa useStore(); todas dividem a mesma conexão.
import { useSyncExternalStore } from 'react';
import { api } from '@/lib/api';
import { cssDaCor } from '@shared/cores.js';
import { DEFAULT_CONFIG, type AppConfig, type Media, type QueueItem, type QueueRoom, type QueueService } from '@/types/queue';

export interface Snapshot {
  services: QueueService[];
  rooms: QueueRoom[];
  items: QueueItem[];
  midias: Media[];
  config: AppConfig;
  loaded: boolean;
  online: boolean;
}

interface EstadoServidor {
  servicos: QueueService[];
  salas: QueueRoom[];
  itens: QueueItem[];
  midias: Media[];
  config: AppConfig;
  horaServidor: string;
}

declare global {
  interface Window {
    __FILA_CONFIG__?: AppConfig | null;
  }
}

let snap: Snapshot = {
  services: [],
  rooms: [],
  items: [],
  midias: [],
  config: { ...DEFAULT_CONFIG, ...(window.__FILA_CONFIG__ || {}) },
  loaded: false,
  online: true,
};

const listeners = new Set<() => void>();
let started = false;
let buscando = false;
let sujo = false;
let relogioOffset = 0; // servidor - este aparelho (ms): corrige relógios desencontrados na rede

/** Hora "oficial" (do servidor), para cálculos de tempo de espera. */
export const agoraServidor = () => Date.now() + relogioOffset;

function publicar(parcial: Partial<Snapshot>) {
  snap = { ...snap, ...parcial };
  listeners.forEach((l) => l());
}

function aplicarTema(cfg: AppConfig) {
  let el = document.getElementById('tema-marca') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'tema-marca';
    document.head.appendChild(el);
  }
  const css = cssDaCor(cfg.brand_color);
  if (el.textContent !== css) el.textContent = css;

  document.title = `${cfg.clinic_name} · Fila`;
  let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!icon) {
    icon = document.createElement('link');
    icon.rel = 'icon';
    document.head.appendChild(icon);
  }
  const href = cfg.logo_url || '';
  if (href && icon.getAttribute('href') !== href) icon.setAttribute('href', href);
}

/** Pré-visualização ao vivo (tela de Ajustes) antes de salvar. */
export function aplicarTemaTemporario(cor: string) {
  aplicarTema({ ...snap.config, brand_color: cor });
}

export async function refresh(): Promise<void> {
  if (buscando) {
    sujo = true;
    return;
  }
  buscando = true;
  try {
    const t0 = Date.now();
    const s = await api<EstadoServidor>('GET', '/api/state');
    const meio = (Date.now() + t0) / 2;
    relogioOffset = new Date(s.horaServidor).getTime() - meio;
    publicar({
      services: s.servicos,
      rooms: s.salas,
      items: s.itens,
      midias: s.midias,
      config: s.config,
      loaded: true,
      online: true,
    });
    aplicarTema(s.config);
  } catch {
    publicar({ online: false });
  } finally {
    buscando = false;
    if (sujo) {
      sujo = false;
      void refresh();
    }
  }
}

function iniciar() {
  if (started) return;
  started = true;
  aplicarTema(snap.config);
  void refresh();

  const es = new EventSource('/api/events');
  es.addEventListener('changed', () => void refresh());
  es.onopen = () => void refresh(); // reconectou: puxa o que perdeu
  es.onerror = () => publicar({ online: false });

  // Rede de segurança (Wi-Fi instável): confere o servidor a cada 10 s.
  setInterval(() => void refresh(), 10000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void refresh();
  });
}

function subscribe(l: () => void) {
  iniciar();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(): Snapshot {
  return useSyncExternalStore(subscribe, () => snap);
}
