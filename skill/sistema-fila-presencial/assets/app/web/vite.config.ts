import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const api = process.env.API_URL || 'http://127.0.0.1:3000';

// Demonstração: leva o guia de instalação e o tour (docs/) para /ajuda/, como o servidor real faz.
// O <base> faz os áudios do tour funcionarem também em /ajuda (sem a barra final).
const guiaNaDemo = (): Plugin => ({
  name: 'guia-na-demo',
  apply: 'build',
  closeBundle() {
    const destino = path.resolve(aqui, 'dist-demo', 'ajuda');
    cpSync(path.resolve(aqui, '../docs'), destino, { recursive: true });
    const html = readFileSync(path.join(destino, 'instalacao.html'), 'utf8').replace('<head>', '<head>\n<base href="/ajuda/">');
    writeFileSync(path.join(destino, 'index.html'), html);
  },
});

// Em desenvolvimento (npm run dev) o Vite serve a interface e repassa a API ao servidor Node.
// Em produção o próprio servidor Node entrega web/dist.
export default defineConfig(({ mode }) => ({
  root: aqui,
  plugins: [react(), ...(mode === 'demo' ? [guiaNaDemo()] : [])],
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
      '/ajuda': api,
    },
  },
}));
