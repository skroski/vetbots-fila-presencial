import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const api = process.env.API_URL || 'http://127.0.0.1:3000';

// Em desenvolvimento (npm run dev) o Vite serve a interface e repassa a API ao servidor Node.
// Em produção o próprio servidor Node entrega web/dist.
export default defineConfig(({ mode }) => ({
  root: aqui,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(aqui, 'src'),
      '@shared': path.resolve(aqui, '../shared'),
    },
  },
  build: {
    // --mode demo gera a versão estática para a Vercel (API simulada no navegador, sem servidor)
    outDir: path.resolve(aqui, mode === 'demo' ? 'dist-demo' : 'dist'),
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': api,
      '/midia': api,
      '/marca': api,
    },
  },
}));
