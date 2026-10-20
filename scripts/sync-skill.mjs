// Copia o aplicativo deste repositório para dentro da skill (skill/sistema-fila-presencial/assets/app),
// para que a skill leve o pacote completo e funcione offline.
//   npm run sync-skill
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'skill', 'sistema-fila-presencial', 'assets', 'app');

const itens = [
  'package.json',
  'package-lock.json',
  'server',
  'shared',
  'web',
  'scripts',
  'docs',
  'Dockerfile',
  'docker-compose.yml',
  '.dockerignore',
  '.env.example',
  '.gitignore',
  'iniciar.bat',
  'iniciar.command',
  'iniciar.sh',
  'README.md',
];

// Fora do pacote: dependências, build, dados reais e o que só serve ao desenvolvimento desta skill.
const ignorar = (origem) => {
  const rel = origem.slice(raiz.length + 1).replaceAll('\\', '/');
  return !(
    /(^|\/)(node_modules|dist|\.DS_Store)(\/|$)/.test(rel) ||
    rel === 'scripts/sync-skill.mjs' ||
    rel.startsWith('server/test/tmp')
  );
};

rmSync(destino, { recursive: true, force: true });
mkdirSync(join(destino, 'data'), { recursive: true });
cpSync(join(raiz, 'data', '.gitkeep'), join(destino, 'data', '.gitkeep'));

for (const item of itens) {
  const origem = join(raiz, item);
  if (!existsSync(origem)) {
    console.warn(`  (ignorado: ${item} ainda não existe)`);
    continue;
  }
  cpSync(origem, join(destino, item), { recursive: true, filter: ignorar });
}
console.log(`Aplicativo copiado para ${destino}`);
