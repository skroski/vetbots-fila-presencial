// Monta desktop/app/ com o que o aplicativo precisa: servidor, interface já gerada (web/dist),
// Ajuda (docs) e o processo principal do Electron. O electron-builder empacota esta pasta.
//   node desktop/preparar.mjs   (rodado automaticamente por npm start / npm run dist dentro de desktop/)
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..');
const destino = join(aqui, 'app');

if (!existsSync(join(raiz, 'web', 'dist', 'index.html'))) {
  console.error('\n  Interface não gerada. Na raiz do projeto rode "npm run build" e tente de novo.\n');
  process.exit(1);
}

const raizPkg = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'));

// Mantém node_modules entre execuções (instalação mais rápida); o resto é recriado do zero.
mkdirSync(destino, { recursive: true });
for (const item of ['server', 'shared', 'web', 'docs', 'main.cjs', 'icon.png', 'package.json']) {
  rmSync(join(destino, item), { recursive: true, force: true });
}

const semTestes = (origem) => !/[\\/]server[\\/]test([\\/]|$)/.test(origem) && !/\.DS_Store$/.test(origem);
cpSync(join(raiz, 'server'), join(destino, 'server'), { recursive: true, filter: semTestes });
cpSync(join(raiz, 'shared'), join(destino, 'shared'), { recursive: true, filter: semTestes });
cpSync(join(raiz, 'web', 'dist'), join(destino, 'web', 'dist'), { recursive: true });
cpSync(join(raiz, 'docs'), join(destino, 'docs'), { recursive: true, filter: semTestes });
cpSync(join(aqui, 'main.cjs'), join(destino, 'main.cjs'));
cpSync(join(aqui, 'build', 'icon.png'), join(destino, 'icon.png'));

// package.json do aplicativo: só o necessário para rodar (sem devDependencies nem scripts).
const appPkg = {
  name: 'fila-presencial',
  productName: 'Fila Presencial',
  version: raizPkg.version,
  description: raizPkg.description,
  author: { name: 'VetBots', email: 'daniel@duplod.com.br' },
  license: raizPkg.license,
  homepage: 'https://github.com/skroski/vetbots-fila-presencial',
  private: true,
  type: 'module',
  main: 'main.cjs',
  dependencies: raizPkg.dependencies,
};
writeFileSync(join(destino, 'package.json'), JSON.stringify(appPkg, null, 2) + '\n');

console.log('[desktop] Instalando dependências do servidor no app...');
const r = spawnSync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund', '--no-package-lock'], {
  cwd: destino,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`[desktop] Pronto: ${destino}`);
