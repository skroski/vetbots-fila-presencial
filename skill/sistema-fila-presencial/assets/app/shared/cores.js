// Gera a escala de cores da marca (brand-50 ... brand-900) a partir de UMA cor escolhida.
// Usado pelo servidor (para pintar a página já na primeira renderização) e pela tela de
// Ajustes (pré-visualização ao vivo). Retorna "r g b" para o Tailwind aplicar transparência.

const TONS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

// Quanto misturar com branco (claros) ou preto (escuros) a partir da cor base (500).
const CLAROS = { 50: 0.92, 100: 0.82, 200: 0.64, 300: 0.44, 400: 0.22 };
const ESCUROS = { 600: 0.12, 700: 0.26, 800: 0.4, 900: 0.54 };

export function hexParaRgb(hex) {
  const h = String(hex).replace('#', '');
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
}

const misturar = (rgb, alvo, t) => rgb.map((c) => Math.round(c + (alvo - c) * t));

function luminancia([r, g, b]) {
  const f = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const FUNDO_ESCURO = [44, 38, 33]; // base-100 do tema escuro VetBots: fundo da TV e dos painéis
const BRANCO = [255, 255, 255];

export function escalaDaCor(hex) {
  const base = hexParaRgb(hex);
  const escala = {};
  for (const tom of TONS) {
    if (tom === 500) escala[tom] = base;
    else if (CLAROS[tom] !== undefined) escala[tom] = misturar(base, 255, CLAROS[tom]);
    else escala[tom] = misturar(base, 0, ESCUROS[tom]);
  }
  // Legibilidade: textos "brand-300/400" ficam sobre fundo escuro; botões "brand-600" levam texto branco.
  for (const tom of [400, 300]) {
    let t = CLAROS[tom];
    while (contraste(escala[tom], FUNDO_ESCURO) < 4.5 && t < 0.95) {
      t += 0.05;
      escala[tom] = misturar(base, 255, t);
    }
  }
  // 600 precisa sustentar texto branco; 700-900 escurecem a partir dele (escala sempre monotônica).
  let t = ESCUROS[600];
  while (contraste(escala[600], BRANCO) < 3.5 && t < 0.8) {
    t += 0.05;
    escala[600] = misturar(base, 0, t);
  }
  escala[700] = misturar(escala[600], 0, 0.14);
  escala[800] = misturar(escala[600], 0, 0.3);
  escala[900] = misturar(escala[600], 0, 0.46);
  return escala;
}

// sRGB -> OKLCH ("L C H", o formato que o daisyUI 4 usa nas variáveis --p, --a...)
function oklch([r, g, b]) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, Bb);
  const H = ((Math.atan2(Bb, A) * 180) / Math.PI + 360) % 360;
  return `${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(2)}`;
}

const TEXTO_ESCURO = [11, 42, 48];

// Texto sobre a cor: branco ou escuro, o que tiver mais contraste
const conteudoSobre = (rgb) => (contraste(rgb, BRANCO) >= contraste(rgb, TEXTO_ESCURO) ? BRANCO : TEXTO_ESCURO);

// Cor da marca nos temas do daisyUI: botões (--p) e texto/ícones de destaque (--a).
// Claro: 600 nos botões e 700 no texto. Escuro: 400 (mais viva) nos botões e 300 no texto.
function temaDaisy(nome, primaria, destaque) {
  const pc = conteudoSobre(primaria);
  const ac = conteudoSobre(destaque);
  return `:root[data-theme=${nome}]{--p:${oklch(primaria)};--pc:${oklch(pc)};--a:${oklch(destaque)};--ac:${oklch(ac)}}`;
}

// ":root{--brand-50:236 253 245;...}" + variáveis dos temas vetbots / vetbots-dark
export function cssDaCor(hex) {
  const escala = escalaDaCor(hex);
  const vars = TONS.map((t) => `--brand-${t}:${escala[t].join(' ')}`).join(';');
  const [r, g, b] = escala[500];
  return [
    `:root{${vars};--brand-glow:${r} ${g} ${b}}`,
    temaDaisy('vetbots', escala[600], escala[700]),
    temaDaisy('vetbots-dark', escala[400], escala[300]),
  ].join('');
}
