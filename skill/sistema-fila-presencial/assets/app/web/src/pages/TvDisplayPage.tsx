import { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX, Bell, Monitor, Lock, Unlock, Sparkles, Maximize } from 'lucide-react';
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
      <div className="inline-flex items-center gap-2 text-brand-400 text-sm md:text-lg uppercase tracking-[.3em] font-semibold bg-brand-500/10 px-6 py-2 rounded-full border border-brand-500/20">
        <Bell className="h-5 w-5 animate-bounce" />
        <span>Chamada Atual</span>
      </div>

      <div className={`mt-4 transition-all duration-500 transform ${pulsing ? 'scale-110 text-brand-300' : 'text-white'}`}>
        <span
          className={`font-mono font-black tracking-tighter leading-none drop-shadow-[0_10px_35px_rgb(var(--brand-glow)/0.25)] ${
            compact ? 'text-[clamp(4rem,9vw,9rem)]' : 'text-9xl md:text-[14rem]'
          }`}
        >
          {current?.senha || '— —'}
        </span>
      </div>

      <p
        className={`mt-4 font-extrabold tracking-tight text-white/95 max-w-4xl truncate ${
          compact ? 'text-2xl xl:text-4xl max-w-full px-2' : 'text-3xl md:text-6xl'
        }`}
      >
        {nomeExibido(current, privacy)}
      </p>

      <div className={`mt-8 flex flex-wrap items-center justify-center gap-4 text-slate-300 ${compact ? 'text-lg xl:text-2xl' : 'text-xl md:text-3xl'}`}>
        {current ? (
          <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-900/90 border border-slate-700/80 px-6 py-4 rounded-2xl shadow-xl">
            <span className="text-brand-400 font-bold">Dirija-se ao:</span>
            <strong className="text-white font-black">{room?.nome || 'Consultório Principal'}</strong>
            {current.veterinario_nome && (
              <span className="text-slate-400 text-base md:text-xl border-l border-slate-700 pl-3">
                {/^dra?\.?\s/i.test(current.veterinario_nome) ? '' : 'Dr(a). '}{current.veterinario_nome}
              </span>
            )}
          </div>
        ) : (
          <div className="text-slate-500 text-lg">Por favor, aguarde no saguão. Acompanhe a chamada na tela.</div>
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
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-4">
        <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-brand-400" />
          <span>Chamadas Recentes</span>
        </h2>
        <div className={`grid ${cols} gap-2`}>
          {recentes.slice(0, compact ? 2 : 4).map((item) => (
            <div key={item.id} className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl text-center">
              <div className="font-mono text-2xl font-bold text-slate-200">{item.senha}</div>
              <div className="text-xs text-brand-400 font-medium truncate mt-0.5">
                {rooms.find((r) => r.id === item.sala_id)?.nome || 'Consultório'}
              </div>
            </div>
          ))}
          {recentes.length === 0 && (
            <div className="col-span-full text-xs text-slate-500 text-center py-3">Nenhuma outra chamada recente registrada</div>
          )}
        </div>
      </div>

      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-4">
        <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>Próximos a Serem Atendidos</span>
        </h2>
        <div className={`grid ${cols} gap-2`}>
          {waiting.slice(0, compact ? 2 : 4).map((item) => (
            <div key={item.id} className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl text-center">
              <div className="font-mono text-xl font-bold text-slate-300">{item.senha}</div>
              <div className="text-xs text-slate-400 truncate mt-0.5">{privacy ? 'Aguardando' : item.pet_nome || item.tutor_nome}</div>
            </div>
          ))}
          {waiting.length === 0 && (
            <div className="col-span-full text-xs text-slate-500 text-center py-3">Nenhum paciente aguardando no momento</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TvDisplayPage() {
  const { items, rooms, midias, config, loading } = useQueueSystem();
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => lerPreferencia('vet_tv_sound', config.tv_sound));
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => lerPreferencia('vet_tv_privacy', config.tv_privacy));
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

  const tentarTelaCheia = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const controles = (
    <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
      {needsGesture && (
        <div className="hidden md:block text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-full animate-bounce">
          Toque na tela para ativar o áudio
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          tentarTelaCheia();
        }}
        className="hidden md:flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
        title="Tela cheia"
      >
        <Maximize className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={togglePrivacy}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
          privacyMode
            ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300'
            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
        }`}
        title="Alternar privacidade de nomes"
      >
        {privacyMode ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{privacyMode ? 'Apenas Senha' : 'Exibir Nomes'}</span>
      </button>
      <button
        onClick={toggleSound}
        className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
          soundEnabled
            ? 'border-brand-500/50 bg-brand-500/15 text-brand-300 hover:bg-brand-500/25'
            : 'border-slate-800 bg-slate-900 text-slate-400'
        }`}
      >
        {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        <span className="hidden md:inline">{soundEnabled ? 'Sinal Sonoro Ativo' : 'Mudo'}</span>
      </button>
    </div>
  );

  const titulo = (
    <div className="flex items-center gap-4 min-w-0">
      <BrandMark size="md" />
      <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2 min-w-0">
        <span className="truncate">{config.clinic_name}</span>
        <span className="hidden 2xl:inline-block rounded-full bg-brand-500/20 px-3 py-0.5 text-xs font-semibold tracking-wider text-brand-300 uppercase whitespace-nowrap">
          {config.clinic_subtitle}
        </span>
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
      <div onClick={aoClicar} className="fixed inset-0 bg-black text-white select-none overflow-hidden">
        <TvVideo playlist={playlist} muted={config.tv_video_muted} duck={overlay} className="absolute inset-0 h-full w-full" fit="cover" />

        <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-4 p-4 bg-gradient-to-b from-black/70 to-transparent">
          {titulo}
          {controles}
        </div>

        {/* Faixa permanente com a última chamada */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-8 pt-16 pb-6 flex items-end justify-between gap-6">
          <div className="flex items-end gap-5 min-w-0">
            <span className="font-mono text-6xl xl:text-8xl font-black leading-none text-white">{current?.senha || '— —'}</span>
            <div className="pb-1 min-w-0">
              <div className="text-brand-400 text-sm uppercase tracking-[.25em] font-semibold">Chamada atual</div>
              <div className="text-xl xl:text-3xl font-bold truncate">
                {current ? `${nomeExibido(current, privacyMode)} · ${currentRoom?.nome || 'Consultório'}` : 'Aguardando próxima chamada'}
              </div>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3 pb-1">
            <span className="text-xs uppercase tracking-wider text-slate-400">Próximos</span>
            {waiting.slice(0, 4).map((w) => (
              <span key={w.id} className="font-mono text-2xl font-bold text-slate-200 bg-white/10 rounded-lg px-3 py-1">
                {w.senha}
              </span>
            ))}
          </div>
        </div>

        {/* Aviso de nova chamada em tela cheia */}
        {overlay && current && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col justify-center p-10 animate-fade">
            <CallBlock current={current} room={currentRoom} privacy={privacyMode} pulsing={isPulsing} compact={false} />
          </div>
        )}
      </div>
    );
  }

  // ---------- Layout 2: vídeo à esquerda, painel de chamadas à direita ----------
  if (lateral) {
    return (
      <div onClick={aoClicar} className="h-screen bg-slate-950 text-white flex flex-col p-5 gap-4 select-none overflow-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
          {titulo}
          {controles}
        </header>
        <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5">
          <div className="rounded-3xl overflow-hidden bg-black border border-slate-800 min-h-0">
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

  // ---------- Layout 3 (sem vídeos): chamada em destaque absoluto ----------
  return (
    <div onClick={aoClicar} className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 md:p-10 select-none overflow-hidden">
      <header className="flex items-center justify-between border-b border-slate-800 pb-5 gap-4">
        {titulo}
        {controles}
      </header>
      <main className="my-auto py-8">
        <CallBlock current={current} room={currentRoom} privacy={privacyMode} pulsing={isPulsing} compact={false} />
      </main>
      <footer className="border-t border-slate-800/80 pt-6">
        <Footer recentes={chamados.slice(1)} waiting={waiting} rooms={rooms} privacy={privacyMode} compact={false} />
      </footer>
    </div>
  );
}
