import type { Config } from 'tailwindcss';
import daisyui from 'daisyui';
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
  darkMode: ['selector', '[data-theme="vetbots-dark"]'],
  theme: {
    extend: {
      colors: { brand },
      // Cantos suaves: teto de 8px (círculos e pills usam rounded-full)
      borderRadius: { lg: '0.5rem', xl: '0.5rem', '2xl': '0.5rem', '3xl': '0.5rem' },
      boxShadow: {
        soft: '0 4px 20px rgba(46, 50, 48, 0.06)',
        medium: '0 8px 30px rgba(46, 50, 48, 0.10)',
        strong: '0 20px 40px rgba(46, 50, 48, 0.15)',
      },
      keyframes: { fade: { from: { opacity: '0' }, to: { opacity: '1' } } },
      animation: { fade: 'fade .3s cubic-bezier(0.4, 0, 0.2, 1)' },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'system-ui', '-apple-system', 'sans-serif'],
        title: ['"Plus Jakarta Sans"', 'Arial', 'Helvetica', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [daisyui],
  // Temas VetBots (design.md). A cor da marca (primary/accent) é sobrescrita pelo servidor a partir
  // da cor escolhida em /config (ver shared/cores.js); os valores abaixo são o padrão da identidade.
  daisyui: {
    logs: false,
    darkTheme: 'vetbots-dark',
    themes: [
      {
        vetbots: {
          primary: 'hsl(190 67% 40%)',
          'primary-content': 'hsl(190 100% 98%)',
          secondary: 'hsl(28 65% 35%)',
          'secondary-content': 'hsl(28 100% 97%)',
          accent: 'hsl(190 67% 28%)',
          'accent-content': 'hsl(190 100% 98%)',
          neutral: 'hsl(190 5% 25%)',
          'neutral-content': 'hsl(190 10% 97%)',
          'base-100': 'hsl(190 15% 100%)',
          'base-200': 'hsl(190 10% 97%)',
          'base-300': 'hsl(190 10% 92%)',
          'base-content': 'hsl(190 15% 12%)',
          info: 'hsl(190 70% 45%)',
          'info-content': 'hsl(190 100% 8%)',
          success: 'hsl(142 60% 35%)',
          'success-content': 'hsl(0 0% 100%)',
          warning: 'hsl(28 70% 45%)',
          'warning-content': 'hsl(0 0% 100%)',
          error: 'hsl(0 75% 45%)',
          'error-content': 'hsl(0 0% 100%)',
          '--rounded-box': '0.5rem',
          '--rounded-btn': '0.5rem',
          '--rounded-badge': '0.5rem',
          '--tab-radius': '0.5rem',
          '--animation-btn': '0.2s',
          '--animation-input': '0.2s',
          '--btn-focus-scale': '0.95',
          '--border-btn': '1px',
        },
        'vetbots-dark': {
          primary: 'hsl(190 60% 50%)',
          'primary-content': 'hsl(190 80% 8%)',
          secondary: 'hsl(28 60% 50%)',
          'secondary-content': 'hsl(28 80% 8%)',
          accent: 'hsl(190 60% 70%)',
          'accent-content': 'hsl(190 80% 8%)',
          neutral: 'hsl(28 8% 70%)',
          'neutral-content': 'hsl(28 15% 12%)',
          'base-100': 'hsl(28 15% 15%)',
          'base-200': 'hsl(28 15% 12%)',
          'base-300': 'hsl(28 10% 22%)',
          'base-content': 'hsl(28 10% 95%)',
          info: 'hsl(190 70% 55%)',
          'info-content': 'hsl(190 80% 8%)',
          success: 'hsl(142 55% 50%)',
          'success-content': 'hsl(142 80% 8%)',
          warning: 'hsl(28 75% 58%)',
          'warning-content': 'hsl(28 80% 8%)',
          error: 'hsl(0 80% 62%)',
          'error-content': 'hsl(0 80% 8%)',
          '--rounded-box': '0.5rem',
          '--rounded-btn': '0.5rem',
          '--rounded-badge': '0.5rem',
          '--tab-radius': '0.5rem',
          '--animation-btn': '0.2s',
          '--animation-input': '0.2s',
          '--btn-focus-scale': '0.95',
          '--border-btn': '1px',
        },
      },
    ],
  },
} satisfies Config;
