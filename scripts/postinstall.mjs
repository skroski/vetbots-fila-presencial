// Depois do `npm install`, gera a interface (web/dist) para o `npm start` funcionar de primeira.
// Nunca falha a instalação: se algo der errado, o servidor explica como corrigir.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (process.env.SKIP_BUILD === '1') process.exit(0);
if (!existsSync(join(root, 'web', 'src'))) process.exit(0);
if (!existsSync(join(root, 'node_modules', 'vite'))) {
  console.log('[fila] vite não instalado (modo produção?). Rode "npm run build" depois de instalar as devDependencies.');
  process.exit(0);
}

console.log('[fila] Gerando a interface (npm run build)...');
const r = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
if (r.status !== 0) console.log('[fila] Build falhou. Rode "npm run build" manualmente para ver o erro.');
process.exit(0);
