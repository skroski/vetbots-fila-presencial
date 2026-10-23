import { useCallback, useEffect, useRef, useState } from 'react';
import type { Media } from '@/types/queue';

// API de IFrame do YouTube (carregada só quando há vídeo do YouTube na playlist; MP4 não usa internet).
interface YtPlayer {
  destroy: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (v: number) => void;
  seekTo: (s: number, permitirBusca: boolean) => void;
  playVideo: () => void;
}
interface YtApi {
  Player: new (el: HTMLElement, opcoes: Record<string, unknown>) => YtPlayer;
}
declare global {
  interface Window {
    YT?: YtApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let carregandoYt: Promise<YtApi> | null = null;
function carregarYoutube(): Promise<YtApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!carregandoYt) {
    carregandoYt = new Promise<YtApi>((ok, falhou) => {
      const antes = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        antes?.();
        if (window.YT) ok(window.YT);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => {
        carregandoYt = null; // sem internet agora: tenta de novo na próxima vez
        s.remove();
        falhou(new Error('YouTube indisponível'));
      };
      document.head.appendChild(s);
    });
  }
  return carregandoYt;
}

const ESTADO_FIM = 0;
const ESTADO_TOCANDO = 1;
const LIMITE_INICIO_MS = 20000;

/** Player do YouTube: começa mudo, avança sozinho ao terminar e pula o vídeo se não puder ser exibido. */
function YoutubePlayer({
  id,
  muted,
  duck,
  fit,
  unico,
  aoTerminar,
  aoFalhar,
  aoTocar,
}: {
  id: string;
  muted: boolean;
  duck: boolean;
  fit: 'contain' | 'cover';
  unico: boolean;
  aoTerminar: () => void;
  aoFalhar: () => void;
  aoTocar: () => void;
}) {
  const alvo = useRef<HTMLDivElement>(null);
  const player = useRef<YtPlayer | null>(null);
  // Os callbacks mudam a cada render; o player guarda sempre a versão mais recente.
  const cb = useRef({ aoTerminar, aoFalhar, aoTocar, unico, muted, duck });
  cb.current = { aoTerminar, aoFalhar, aoTocar, unico, muted, duck };

  useEffect(() => {
    let vivo = true;
    let tocou = false;
    let falhou = false;
    // Timeout, erro do player e falha de rede podem disparar juntos: conta uma falha só por vídeo.
    const falhar = () => {
      if (!vivo || falhou) return;
      falhou = true;
      cb.current.aoFalhar();
    };
    const limite = setTimeout(() => {
      if (!tocou) falhar();
    }, LIMITE_INICIO_MS);

    carregarYoutube()
      .then((YT) => {
        if (!vivo || !alvo.current) return;
        const el = document.createElement('div');
        alvo.current.appendChild(el);
        player.current = new YT.Player(el, {
          videoId: id,
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e: { target: YtPlayer }) => {
              e.target.setVolume(cb.current.duck ? 12 : 100);
              e.target.playVideo();
            },
            onStateChange: (e: { data: number; target: YtPlayer }) => {
              if (e.data === ESTADO_TOCANDO) {
                if (!tocou) {
                  tocou = true;
                  clearTimeout(limite);
                  if (!cb.current.muted) e.target.unMute();
                }
                cb.current.aoTocar();
              } else if (e.data === ESTADO_FIM) {
                if (cb.current.unico) {
                  e.target.seekTo(0, true);
                  e.target.playVideo();
                } else cb.current.aoTerminar();
              }
            },
            // 100 não existe, 101/150 não permite incorporar, 5 erro do player: pula para o próximo.
            onError: falhar,
          },
        });
      })
      .catch(falhar);

    return () => {
      vivo = false;
      clearTimeout(limite);
      try {
        player.current?.destroy();
      } catch {
        /* player já removido */
      }
      player.current = null;
      if (alvo.current) alvo.current.innerHTML = '';
    };
  }, [id]);

  useEffect(() => {
    try {
      player.current?.setVolume(duck ? 12 : 100);
    } catch {
      /* player ainda carregando */
    }
  }, [duck]);

  useEffect(() => {
    try {
      if (muted) player.current?.mute();
      else player.current?.unMute();
    } catch {
      /* player ainda carregando */
    }
  }, [muted]);

  // O iframe não tem object-fit: no modo "cover" ele é maior que a área e centralizado (a tela cheia usa a janela toda).
  const estilo =
    fit === 'cover'
      ? { width: 'max(100vw, 177.78vh)', height: 'max(100vh, 56.25vw)', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
      : { width: '100%', height: '100%', left: 0, top: 0 };

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <div ref={alvo} className="pointer-events-none absolute [&>iframe]:h-full [&>iframe]:w-full" style={estilo} />
    </div>
  );
}

/**
 * Playlist de vídeos da TV: toca em sequência e volta ao início (loop infinito). Aceita MP4 enviados e links do YouTube.
 * Começa mudo (navegadores só liberam autoplay sem som); se um vídeo falhar, pula para o próximo.
 */
export default function TvVideo({
  playlist,
  muted,
  duck,
  className = '',
  fit = 'contain',
}: {
  playlist: Media[];
  muted: boolean;
  /** Abaixa o volume durante o aviso de chamada */
  duck: boolean;
  className?: string;
  fit?: 'contain' | 'cover';
}) {
  const [indice, setIndice] = useState(0);
  const ref = useRef<HTMLVideoElement>(null);
  const errosSeguidos = useRef(0);
  const [pausado, setPausado] = useState(false);

  const atual = playlist.length ? playlist[indice % playlist.length] : null;

  // Playlist encolheu (vídeo desativado/excluído): garante um índice válido.
  useEffect(() => {
    if (indice >= playlist.length) setIndice(0);
  }, [playlist.length, indice]);

  const proximo = useCallback(() => setIndice((i) => (playlist.length ? (i + 1) % playlist.length : 0)), [playlist.length]);

  const aoFalhar = () => {
    errosSeguidos.current += 1;
    if (errosSeguidos.current >= playlist.length) {
      // Nenhum vídeo toca (formato/codec não suportado, ou YouTube sem internet): espera e tenta de novo.
      errosSeguidos.current = 0;
      setPausado(true);
      setTimeout(() => {
        setPausado(false);
        proximo();
      }, 30000);
      return;
    }
    proximo();
  };

  useEffect(() => {
    const v = ref.current;
    if (v) v.volume = duck ? 0.12 : 1;
  }, [duck, atual?.id]);

  const aoCarregar = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = muted;
    v.play().catch(() => {
      // Sem permissão para tocar com som: cai para mudo em vez de travar.
      v.muted = true;
      v.play().catch(() => {});
    });
  };

  if (!atual) return null;

  if (pausado) {
    return (
      <div className={`${className} flex items-center justify-center bg-black p-6 text-center text-base text-neutral`}>
        Não foi possível reproduzir os vídeos. Vídeos do YouTube precisam de internet; para MP4 use H.264/AAC.
      </div>
    );
  }

  if (atual.tipo === 'youtube' && atual.youtube_id) {
    return (
      <div className={`${className} relative overflow-hidden bg-black`}>
        <YoutubePlayer
          key={atual.id}
          id={atual.youtube_id}
          muted={muted}
          duck={duck}
          fit={fit}
          unico={playlist.length === 1}
          aoTerminar={proximo}
          aoFalhar={aoFalhar}
          aoTocar={() => (errosSeguidos.current = 0)}
        />
      </div>
    );
  }

  return (
    <video
      key={atual.id}
      ref={ref}
      src={atual.url}
      className={`${className} bg-black ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
      autoPlay
      muted={muted}
      playsInline
      preload="auto"
      loop={playlist.length === 1}
      onLoadedData={aoCarregar}
      onPlaying={() => (errosSeguidos.current = 0)}
      onEnded={proximo}
      onError={aoFalhar}
    />
  );
}
