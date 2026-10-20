import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    // Caminho explícito: o build roda da raiz do projeto, não de web/
    tailwindcss: { config: path.join(aqui, 'tailwind.config.ts') },
    autoprefixer: {},
  },
};
