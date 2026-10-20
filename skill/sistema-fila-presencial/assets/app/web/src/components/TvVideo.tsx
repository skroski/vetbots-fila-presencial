import { useCallback, useEffect, useRef, useState } from 'react';
import type { Media } from '@/types/queue';

/**
 * Playlist de vídeos da TV: toca em sequência e volta ao início (loop infinito).
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
      // Nenhum vídeo toca (formato/codec não suportado pela TV): espera e tenta de novo.
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

  return pausado ? (
    <div className={`${className} bg-black flex items-center justify-center text-slate-500 text-sm`}>
      Não foi possível reproduzir os vídeos. Use MP4 (H.264/AAC).
    </div>
  ) : (
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
