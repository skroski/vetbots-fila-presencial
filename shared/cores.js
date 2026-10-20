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

const FUNDO_ESCURO = [2, 6, 23]; // slate-950: fundo da TV e dos painéis
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

// ":root{--brand-50:236 253 245;...}"
export function cssDaCor(hex) {
  const escala = escalaDaCor(hex);
  const vars = TONS.map((t) => `--brand-${t}:${escala[t].join(' ')}`).join(';');
  const [r, g, b] = escala[500];
  return `:root{${vars};--brand-glow:${r} ${g} ${b}}`;
}
