// Síntese sonoro de chamada clínica (Web Audio API nativa)
// Não requer download de arquivos MP3 externos e funciona com latência zero.

let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return null;

    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      globalAudioCtx = new AudioCtxClass();
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch (err) {
    console.warn('Web Audio API indisponível:', err);
    return null;
  }
}

/**
 * Toca sinal sonoro agradável de hospital/clínica (Dois tons harmônicos)
 * Tom 1: Ré 5 (587.33 Hz)
 * Tom 2: Lá 5 (880.00 Hz)
 */
export function tocarChimeFila(): boolean {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    const t = ctx.currentTime;

    // Tom 1 - D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, t);
    gain1.gain.setValueAtTime(0.28, t);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.55);

    // Tom 2 - A5 (880.00 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, t + 0.22);
    gain2.gain.setValueAtTime(0.38, t + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.22);
    osc2.stop(t + 1.15);

    return true;
  } catch (err) {
    console.warn('Erro ao emitir sinal sonoro:', err);
    return false;
  }
}

/**
 * Libera o contexto de áudio em resposta a uma interação do usuário
 */
export function desbloquearAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}
