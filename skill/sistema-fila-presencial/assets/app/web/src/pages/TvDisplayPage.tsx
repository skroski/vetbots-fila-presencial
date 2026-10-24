import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX, Bell, Monitor, Lock, Unlock, Sparkles, Maximize, Moon, Sun } from 'lucide-react';
import { useQueueSystem } from '@/hooks/useQueueSystem';
import { tocarChimeFila, desbloquearAudio } from '@/lib/audioChime';
import BrandMark from '@/components/BrandMark';
import TvVideo from '@/components/TvVideo';
import type { QueueItem, QueueRoom } from '@/types/queue';

const ORDEM_PRIORIDADE = { emergencia: 0, prioridade: 1, normal: 2 } as const;

function lerPreferencia(chave: string, padrao: boolean) {
  try {
    const v = localStorage.getItem(chave);
    return v === null ? padrao : v === 'true';
  } catch {
    return padrao;
  }
}

function nomeExibido(item: QueueItem | null, privacy: boolean) {
  if (privacy) return item?.senha ? `Senha ${item.senha}` : 'Aguardando próxima chamada';
  if (item?.pet_nome) return `${item.pet_nome} (${item.tutor_nome})`;
  return item?.tutor_nome || (item?.senha ? 'Paciente Chamado' : 'Aguardando próxima chamada');
}

/** Chamada atual: senha gigante, nome, sala e veterinário. */
function CallBlock({
  current,
  room,
  privacy,
  pulsing,
  compact,
}: {
  current: QueueItem | null;
  room: QueueRoom | undefined;
  privacy: boolean;
  pulsing: boolean;
  compact: boolean;
}) {
  return (
    <div className="text-center flex flex-col items-center justify-center">
      <div className="badge badge-soft-primary badge-lg h-auto gap-2 px-6 py-2 text-sm md:text-lg font-semibold">
        <Bell className="h-5 w-5 animate-bounce" />
        <span>Chamada Atual</span>
      </div>

      <div className={`mt-4 transition-all duration-500 transform ${pulsing ? 'scale-110 text-accent' : 'text-base-content'}`}>
        <span
          className={`font-mono font-black tracking-tighter leading-none drop-shadow-[0_10px_35px_rgb(var(--brand-glow)/0.25)] ${
            compact ? 'text-[clamp(4rem,9vw,9rem)]' : 'text-9xl md:text-[14rem]'
          }`}
        >
          {current?.senha || '— —'}
        </span>
      </div>

      <p
        className={`mt-4 font-extrabold tracking-tight text-base-content max-w-4xl truncate ${
          compact ? 'text-2xl xl:text-4xl max-w-full px-2' : 'text-3xl md:text-6xl'
        }`}
      >
        {nomeExibido(current, privacy)}
      </p>

      <div className={`mt-8 flex flex-wrap items-center justify-center gap-4 text-base-content/80 ${compact ? 'text-lg xl:text-2xl' : 'text-xl md:text-3xl'}`}>
        {current ? (
          <div className="card flex-row flex-wrap items-center justify-center gap-3 bg-base-100 border border-base-300 px-6 py-4 shadow-medium">
            <span className="text-accent font-bold">Dirija-se ao:</span>
            <strong className="text-base-content font-black">{room?.nome || 'Consultório Principal'}</strong>
            {current.veterinario_nome && (
              <span className="text-neutral text-base md:text-xl border-l border-base-300 pl-3">
                {/^dra?\.?\s/i.test(current.veterinario_nome) ? '' : 'Dr(a). '}{current.veterinario_nome}
              </span>
            )}
          </div>
        ) : (
          <div className="text-neutral text-lg">Por favor, aguarde no saguão. Acompanhe a chamada na tela.</div>
        )}
      </div>
    </div>
  );
}

/** Rodapé: chamadas recentes e próximos da fila. */
function Footer({
  recentes,
  waiting,
  rooms,
  privacy,
  compact,
}: {
  recentes: QueueItem[];
  waiting: QueueItem[];
  rooms: QueueRoom[];
  privacy: boolean;
  compact: boolean;
}) {
  const cols = compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4';
  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 gap-6'}`}>
      <div className="card bg-base-100 border border-base-300 p-4">
        <h2 className="text-xs text-neutral font-semibold mb-3 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-accent" />
          <span>Chamadas Recentes</span>
        </h2>
        <div className={`grid ${cols} gap-2`}>
          {recentes.slice(0, compact ? 2 : 4).map((item) => (
            <div key={item.id} className="bg-base-200 border border-base-300 p-2.5 rounded-lg text-center">
              <div className="font-mono text-2xl font-bold text-base-content">{item.senha}</div>
              <div className="text-xs text-accent font-medium truncate mt-0.5">
                {rooms.find((r) => r.id === item.sala_id)?.nome || 'Consultório'}
              </div>
            </div>
          ))}
          {recentes.length === 0 && (
            <div className="col-span-full text-xs text-neutral text-center py-3">Nenhuma outra chamada recente registrada</div>
          )}
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300 p-4">
        <h2 className="text-xs text-neutral font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-warning" />
          <span>Próximos a Serem Atendidos</span>
        </h2>
        <div className={`grid ${cols} gap-2`}>
          {waiting.slice(0, compact ? 2 : 4).map((item) => (
            <div key={item.id} className="bg-base-200 border border-base-300 p-2.5 rounded-lg text-center">
              <div className="font-mono text-xl font-bold text-base-content/80">{item.senha}</div>
              <div className="text-xs text-neutral truncate mt-0.5">{privacy ? 'Aguardando' : item.pet_nome || item.tutor_nome}</div>
            </div>
          ))}
          {waiting.length === 0 && (
            <div className="col-span-full text-xs text-neutral text-center py-3">Nenhum paciente aguardando no momento</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Layout "vídeo 16:9": a senha é o assunto da tela. Todos os números e nomes usam a cor de texto cheia do tema
 * (base-content sobre base-100, bem acima de 7:1 — WCAG AAA); a chamada nova só muda a borda, nunca a cor do texto.
 */
function ChamadaDestaque({
  current,
  room,
  privacy,
  pulsing,
  painelVw,
}: {
  current: QueueItem | null;
  room: QueueRoom | undefined;
  privacy: boolean;
  pulsing: boolean;
  /** Largura aproximada do painel em vw: a senha e os textos se ajustam a ela (1/3, 1/2 ou 2/3 de vídeo) */
  painelVw: number;
}) {
  // Fonte monoespaçada: cada caractere ocupa ~0,62 em. A senha cresce até caber em 86% do painel, mesmo com 5 caracteres (A1000).
  const caracteres = Math.max(4, (current?.senha || '').length);
  const tamanhoSenha = `max(4rem, min(calc(${(painelVw * 0.86).toFixed(1)}vw / ${(caracteres * 0.62).toFixed(2)}), 38vh))`;
  const tamanhoNome = `clamp(1.5rem, ${(painelVw * 0.058).toFixed(2)}vw, 4.25rem)`;
  const tamanhoSala = `clamp(1.25rem, ${(painelVw * 0.048).toFixed(2)}vw, 3.5rem)`;
  return (
    <section
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Chamada atual"
      className={`flex h-full min-h-0 flex-col items-center justify-center gap-[2.5vh] rounded-lg border-4 bg-base-100 px-6 py-4 text-center transition-colors duration-500 ${
        pulsing ? 'border-warning' : 'border-primary'
      }`}
    >
      <div className="flex items-center gap-3 font-bold uppercase tracking-widest text-base-content" style={{ fontSize: 'clamp(1.25rem, 2.2vw, 2.5rem)' }}>
        <Bell className="h-[1.2em] w-[1.2em]" aria-hidden="true" />
        <span>Chamada atual</span>
      </div>

      <div
        className={`font-mono font-black leading-none tabular-nums tracking-tight text-base-content transition-transform duration-500 ${pulsing ? 'scale-105' : ''}`}
        style={{ fontSize: tamanhoSenha }}
      >
        {current?.senha || '— —'}
      </div>

      <p className="max-w-full truncate font-extrabold text-base-content" style={{ fontSize: tamanhoNome }}>
        {nomeExibido(current, privacy)}
      </p>

      {current ? (
        <div
          className="flex max-w-full flex-wrap items-baseline justify-center gap-x-4 gap-y-1 rounded-lg bg-base-content px-8 py-3 text-base-100"
          style={{ fontSize: tamanhoSala }}
        >
          <span className="font-semibold">Dirija-se ao</span>
          <strong className="font-black">{room?.nome || 'Consultório Principal'}</strong>
          {current.veterinario_nome && (
            <span className="font-semibold" style={{ fontSize: '0.7em' }}>
              {/^dra?\.?\s/i.test(current.veterinario_nome) ? '' : 'Dr(a). '}
              {current.veterinario_nome}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xl text-base-content">Por favor, aguarde no saguão. Acompanhe a chamada na tela.</p>
      )}
    </section>
  );
}

/** Coluna lateral do layout 16:9: chamadas anteriores e próximos, com senhas grandes. */
function ListasGrandes({
  recentes,
  waiting,
  rooms,
  privacy,
  lado,
}: {
  recentes: QueueItem[];
  waiting: QueueItem[];
  rooms: QueueRoom[];
  privacy: boolean;
  /** Coluna larga (vídeo em 1/2 da tela): as duas listas ficam lado a lado em vez de empilhadas */
  lado: boolean;
}) {
  // Limitada também pela altura: em telas baixas (1366x768) as duas listas precisam caber sem cortar.
  const senhaGrande = { fontSize: 'clamp(2rem, min(3.2vw, 5.2vh), 3.75rem)' };
  return (
    <div className={`flex min-h-0 flex-1 gap-3 overflow-hidden ${lado ? 'flex-row' : 'flex-col'}`}>
      <section aria-label="Chamadas anteriores" className={`rounded-lg ${lado ? 'flex-1' : ''} border border-base-300 bg-base-100 p-4`}>
        <h2 className="mb-2 text-lg font-bold text-base-content">Chamadas anteriores</h2>
        <ul className="space-y-1.5">
          {recentes.slice(0, 3).map((item, i) => (
            <li
              key={item.id}
              className={`flex items-baseline justify-between gap-3 rounded-lg bg-base-200 px-4 py-1 ${i === 2 ? 'hidden [@media(min-height:860px)]:flex' : ''}`}
            >
              <span className="font-mono font-black leading-tight tabular-nums text-base-content" style={senhaGrande}>
                {item.senha}
              </span>
              <span className="truncate text-xl font-bold text-base-content">
                {rooms.find((r) => r.id === item.sala_id)?.nome || 'Consultório'}
              </span>
            </li>
          ))}
          {recentes.length === 0 && <li className="py-2 text-lg text-base-content">Nenhuma outra chamada ainda</li>}
        </ul>
      </section>

      <section aria-label="Próximos a serem atendidos" className="min-h-0 flex-1 rounded-lg border border-base-300 bg-base-100 p-4">
        <h2 className="mb-2 text-lg font-bold text-base-content">Próximos</h2>
        <ul className="grid grid-cols-2 gap-2">
          {waiting.slice(0, 4).map((item) => (
            <li key={item.id} className="rounded-lg bg-base-200 px-3 py-1 text-center">
              <span className="block font-mono font-black leading-tight tabular-nums text-base-content" style={senhaGrande}>
                {item.senha}
              </span>
              {!privacy && (item.pet_nome || item.tutor_nome) && (
                <span className="hidden truncate text-base font-semibold text-base-content [@media(min-height:860px)]:block">
                  {item.pet_nome || item.tutor_nome}
                </span>
              )}
            </li>
          ))}
          {waiting.length === 0 && <li className="col-span-2 py-2 text-lg text-base-content">Ninguém aguardando agora</li>}
        </ul>
      </section>
    </div>
  );
}

/** Esconde o cursor (e, na tela cheia, os botões) quando ninguém mexe no mouse: a TV fica limpa para o cliente. */
function useOciosa(ms: number) {
  const [ociosa, setOciosa] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const aoMexer = useCallback(() => {
    setOciosa(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOciosa(true), ms);
  }, [ms]);
  useEffect(() => {
    aoMexer();
    window.addEventListener('keydown', aoMexer);
    window.addEventListener('touchstart', aoMexer);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('keydown', aoMexer);
      window.removeEventListener('touchstart', aoMexer);
    };
  }, [aoMexer]);
  return { ociosa, aoMexer };
}

export default function TvDisplayPage() {
  const { items, rooms, midias, config, loading } = useQueueSystem();
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => lerPreferencia('vet_tv_sound', config.tv_sound));
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => lerPreferencia('vet_tv_privacy', config.tv_privacy));
  const [temaTvLocal, setTemaTvLocal] = useState<'light' | 'dark' | null>(() => {
    try {
      const salvo = localStorage.getItem('vet_tv_theme');
      return salvo === 'light' || salvo === 'dark' ? salvo : null;
    } catch {
      return null;
    }
  });
  const [isPulsing, setIsPulsing] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(true);
  const lastCallKeyRef = useRef<string | null>(null);

  const chamados = useMemo(
    () =>
      items
        .filter((i) => i.status === 'chamado')
        .sort((a, b) => new Date(b.chamado_em || 0).getTime() - new Date(a.chamado_em || 0).getTime()),
    [items],
  );
  const current = chamados[0] || null;

  const waiting = useMemo(
    () =>
      items
        .filter((i) => i.status === 'aguardando')
        .sort(
          (a, b) =>
            ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade] ||
            new Date(a.chegada_em).getTime() - new Date(b.chegada_em).getTime(),
        ),
    [items],
  );

  const currentRoom = rooms.find((r) => r.id === current?.sala_id);

  const playlist = useMemo(() => midias.filter((m) => m.ativo), [midias]);
  const temVideo = playlist.length > 0;
  const telaCheia = temVideo && config.tv_layout === 'tela_cheia';
  const lateral = temVideo && config.tv_layout === 'lateral';
  const compacto = temVideo && config.tv_layout === 'video_16_9';
  const meioDaTela = config.tv_video_size === '1_2';
  const doisTercos = config.tv_video_size === '2_3';
  const { ociosa, aoMexer } = useOciosa(4000);

  // Nova chamada: animação, aviso em tela cheia e som. A primeira leitura só "memoriza" (não toca ao abrir a TV).
  // A dependência é a CHAVE da chamada (texto), não o objeto: a cada atualização do servidor `current` é um objeto
  // novo e reiniciaria os temporizadores, deixando o aviso preso na tela.
  const callKey = current ? `${current.id}_${current.chamado_em || ''}` : '';
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;
  const overlaySecRef = useRef(config.tv_overlay_seconds);
  overlaySecRef.current = config.tv_overlay_seconds;

  useEffect(() => {
    if (loading) return;
    if (lastCallKeyRef.current === null) {
      lastCallKeyRef.current = callKey;
      return;
    }
    if (!callKey || lastCallKeyRef.current === callKey) return;
    lastCallKeyRef.current = callKey;

    setIsPulsing(true);
    setOverlay(true);
    const t1 = setTimeout(() => setIsPulsing(false), 2500);
    const t2 = setTimeout(() => setOverlay(false), overlaySecRef.current * 1000);
    if (soundRef.current) tocarChimeFila();
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsPulsing(false);
      setOverlay(false);
    };
  }, [callKey, loading]);

  const guardar = (chave: string, valor: boolean) => {
    try {
      localStorage.setItem(chave, String(valor));
    } catch {
      /* navegador da TV sem armazenamento: vale só até recarregar */
    }
  };

  const toggleSound = () => {
    desbloquearAudio();
    setNeedsGesture(false);
    setSoundEnabled((prev) => {
      const next = !prev;
      guardar('vet_tv_sound', next);
      if (next) tocarChimeFila();
      return next;
    });
  };

  const togglePrivacy = () => {
    setPrivacyMode((prev) => {
      guardar('vet_tv_privacy', !prev);
      return !prev;
    });
  };

  const temaTv = temaTvLocal || config.tv_theme || 'dark';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', temaTv === 'light' ? 'vetbots' : 'vetbots-dark');
  }, [temaTv]);

  const alternarTemaTv = () => {
    const proximo = temaTv === 'light' ? 'dark' : 'light';
    setTemaTvLocal(proximo);
    document.documentElement.setAttribute('data-theme', proximo === 'light' ? 'vetbots' : 'vetbots-dark');
    try {
      localStorage.setItem('vet_tv_theme', proximo);
    } catch {
      /* sem armazenamento */
    }
  };

  const tentarTelaCheia = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const controles = (
    <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
      {needsGesture && (
        <div className="badge badge-soft-warning hidden md:inline-flex h-auto px-3 py-1.5 animate-bounce">
          Toque na tela para ativar o áudio
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          tentarTelaCheia();
        }}
        className="btn btn-ghost btn-square hidden md:flex"
        aria-label="Tela cheia"
        title="Tela cheia"
      >
        <Maximize className="h-4 w-4" />
      </button>
      <button
        onClick={alternarTemaTv}
        className="btn btn-ghost border-base-300"
        title={temaTv === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
      >
        {temaTv === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        <span className="hidden sm:inline">{temaTv === 'light' ? 'Escuro' : 'Claro'}</span>
      </button>
      <button
        onClick={togglePrivacy}
        className={`btn ${privacyMode ? 'btn-secondary btn-outline' : 'btn-ghost border-base-300'}`}
        title="Alternar privacidade de nomes"
      >
        {privacyMode ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        <span className="hidden sm:inline">{privacyMode ? 'Apenas Senha' : 'Exibir Nomes'}</span>
      </button>
      <button
        onClick={toggleSound}
        className={`btn ${soundEnabled ? 'btn-primary btn-outline' : 'btn-ghost border-base-300'}`}
      >
        {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        <span className="hidden md:inline">{soundEnabled ? 'Sinal Sonoro Ativo' : 'Mudo'}</span>
      </button>
    </div>
  );

  const titulo = (
    <div className="flex items-center gap-4 min-w-0">
      <BrandMark size="md" />
      <h1 className="text-xl md:text-2xl font-black tracking-tight text-base-content flex items-center gap-2 min-w-0">
        {config.show_brand_text ? (
          <>
            <span className="truncate">{config.clinic_name}</span>
            <span className="badge badge-soft-primary hidden 2xl:inline-flex whitespace-nowrap">
              {config.clinic_subtitle}
            </span>
          </>
        ) : (
          <span className="sr-only">{config.clinic_name}</span>
        )}
      </h1>
    </div>
  );

  const aoClicar = () => {
    desbloquearAudio();
    setNeedsGesture(false);
  };

  // ---------- Layout 1: vídeo em tela cheia; a chamada assume a tela por alguns segundos ----------
  if (telaCheia) {
    return (
      <div
        onClick={aoClicar}
        onMouseMove={aoMexer}
        className={`fixed inset-0 bg-black text-white select-none overflow-hidden ${ociosa ? 'cursor-none' : ''}`}
      >
        <TvVideo playlist={playlist} muted={config.tv_video_muted} duck={overlay} className="absolute inset-0 h-full w-full" fit="cover" />

        {/* Marca e botões somem quando ninguém mexe no mouse (voltam ao mexer ou tocar); o aviso de áudio nunca some */}
        <div
          className={`absolute top-0 inset-x-0 flex items-center justify-between gap-4 p-4 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-500 ${
            ociosa && !needsGesture ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {titulo}
          {controles}
        </div>

        {/* Faixa permanente com a última chamada */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-8 pt-16 pb-6 flex items-end justify-between gap-6">
          <div className="flex items-end gap-5 min-w-0">
            <span className="font-mono text-6xl xl:text-8xl font-black leading-none text-base-content">{current?.senha || '— —'}</span>
            <div className="pb-1 min-w-0">
              <div className="text-accent text-sm font-semibold">Chamada atual</div>
              <div className="text-xl xl:text-3xl font-bold truncate">
                {current ? `${nomeExibido(current, privacyMode)} · ${currentRoom?.nome || 'Consultório'}` : 'Aguardando próxima chamada'}
              </div>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3 pb-1">
            <span className="text-xs text-neutral">Próximos</span>
            {waiting.slice(0, 4).map((w) => (
              <span key={w.id} className="font-mono text-2xl font-bold text-base-content bg-white/10 rounded-lg px-3 py-1">
                {w.senha}
              </span>
            ))}
          </div>
        </div>

        {/* Aviso de nova chamada em tela cheia */}
        {overlay && current && (
          <div className="absolute inset-0 bg-base-200/95 flex flex-col justify-center p-10 animate-fade">
            <CallBlock current={current} room={currentRoom} privacy={privacyMode} pulsing={isPulsing} compact={false} />
          </div>
        )}
      </div>
    );
  }

  // ---------- Layout 2: vídeo à esquerda, painel de chamadas à direita ----------
  if (lateral) {
    return (
      <div
        onClick={aoClicar}
        onMouseMove={aoMexer}
        className={`h-screen bg-base-200 text-base-content flex flex-col p-5 gap-4 select-none overflow-hidden ${ociosa ? 'cursor-none' : ''}`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-base-300 pb-4">
          {titulo}
          {controles}
        </header>
        <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5">
          <div className="rounded-lg overflow-hidden bg-black border border-base-300 min-h-0">
            <TvVideo playlist={playlist} muted={config.tv_video_muted} duck={isPulsing} className="h-full w-full" fit="contain" />
          </div>
          <div className="flex flex-col justify-between gap-4 min-h-0 overflow-hidden">
            <div className="my-auto py-2">
              <CallBlock current={current} room={currentRoom} privacy={privacyMode} pulsing={isPulsing} compact />
            </div>
            <Footer recentes={chamados.slice(1)} waiting={waiting} rooms={rooms} privacy={privacyMode} compact />
          </div>
        </div>
      </div>
    );
  }

  // ---------- Layout 3: TV menor/proporcional (1/3, 1/2 ou 2/3 da tela, sempre 16:9) + chamadas ----------
  if (compacto) {
    const colunas = doisTercos
      ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'
      : meioDaTela
        ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
        : 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]';
    const painelVw = doisTercos ? 31 : meioDaTela ? 47 : 62;
    // O vídeo nunca passa de uma altura máxima: sobra espaço para as listas mesmo em telas baixas.
    const vhMax = config.tv_show_lists ? (doisTercos ? 48 : 44) : 72;
    const larguraMax = `min(100%, calc(${vhMax}vh * 16 / 9))`;
    return (
      <div
        onClick={aoClicar}
        onMouseMove={aoMexer}
        className={`flex min-h-screen select-none flex-col gap-4 bg-base-200 p-5 text-base-content lg:h-screen lg:overflow-hidden ${ociosa ? 'cursor-none' : ''}`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-base-300 pb-4">
          {titulo}
          {controles}
        </header>
        <div className={`grid min-h-0 flex-1 grid-cols-1 gap-5 ${colunas}`}>
          <ChamadaDestaque current={current} room={currentRoom} privacy={privacyMode} pulsing={isPulsing} painelVw={painelVw} />
          <div className={`flex min-h-0 flex-col gap-3 ${config.tv_show_lists ? '' : 'justify-center'}`}>
            <div className="mx-auto aspect-video shrink-0 overflow-hidden rounded-lg border border-base-300 bg-black" style={{ width: larguraMax }}>
              <TvVideo playlist={playlist} muted={config.tv_video_muted} duck={isPulsing} className="h-full w-full" fit="contain" />
            </div>
            {config.tv_show_lists && (
              <ListasGrandes recentes={chamados.slice(1)} waiting={waiting} rooms={rooms} privacy={privacyMode} lado={meioDaTela || doisTercos} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Layout sem vídeos: chamada em destaque absoluto ----------
  return (
    <div
      onClick={aoClicar}
      onMouseMove={aoMexer}
      className={`min-h-screen bg-base-200 text-base-content flex flex-col justify-between p-6 md:p-10 select-none overflow-hidden ${ociosa ? 'cursor-none' : ''}`}
    >
      <header className="flex items-center justify-between border-b border-base-300 pb-5 gap-4">
        {titulo}
        {controles}
      </header>
      <main className="my-auto py-8">
        <CallBlock current={current} room={currentRoom} privacy={privacyMode} pulsing={isPulsing} compact={false} />
      </main>
      <footer className="border-t border-base-300 pt-6">
        <Footer recentes={chamados.slice(1)} waiting={waiting} rooms={rooms} privacy={privacyMode} compact={false} />
      </footer>
    </div>
  );
}
