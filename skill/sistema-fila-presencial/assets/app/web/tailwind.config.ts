import type { Config } from 'tailwindcss';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Caminhos absolutos: o build roda da raiz do projeto, não de web/
const aqui = path.dirname(fileURLToPath(import.meta.url));

// A cor da marca vem de variáveis CSS (--brand-50 ... --brand-900) definidas pelo servidor
// a partir da cor escolhida em /config. O formato "r g b / alpha" mantém classes como bg-brand-500/20.
const brand = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((t) => [t, `rgb(var(--brand-${t}) / <alpha-value>)`]),
);

export default {
  content: [path.join(aqui, 'index.html'), path.join(aqui, 'src/**/*.{js,ts,jsx,tsx}')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: { brand },
      keyframes: { fade: { from: { opacity: '0' }, to: { opacity: '1' } } },
      animation: { fade: 'fade .4s ease-out' },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
