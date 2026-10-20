#!/usr/bin/env node
// criar-projeto.mjs: cria (ou atualiza) o projeto da Fila Presencial a partir do pacote desta skill.
//
// Uso:
//   node scripts/criar-projeto.mjs <pasta-destino> [--install] [--git] [--atualizar]
//
//   --install     roda "npm install" (instala e gera a interface) depois de copiar
//   --git         inicia um repositório git na pasta (se ainda não for um) e faz o primeiro commit
//   --atualizar   projeto já instalado: troca só o código, preservando data/ (banco, logo, vídeos) e .env

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(SKILL, 'assets', 'app');

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const alvo = args.find((a) => !a.startsWith('--'));

if (!alvo) {
  console.error('Uso: node scripts/criar-projeto.mjs <pasta-destino> [--install] [--git] [--atualizar]');
  process.exit(1);
}
if (!existsSync(join(APP, 'package.json'))) {
  console.error(`Pacote do aplicativo não encontrado em ${APP}. Reinstale a skill.`);
  process.exit(1);
}

const destino = resolve(alvo);
const atualizando = flags.has('--atualizar');
const run = (cmd, cmdArgs) =>
  spawnSync(cmd, cmdArgs, { cwd: destino, stdio: 'inherit', shell: process.platform === 'win32' }).status === 0;

if (existsSync(destino) && readdirSync(destino).length > 0 && !atualizando) {
  console.error(`A pasta ${destino} não está vazia. Use outra pasta ou --atualizar (preserva data/ e .env).`);
  process.exit(1);
}
if (atualizando && !existsSync(join(destino, 'package.json'))) {
  console.error(`${destino} não parece um projeto da Fila Presencial (sem package.json).`);
  process.exit(1);
}

mkdirSync(destino, { recursive: true });

if (atualizando) {
  // Troca o código; nunca mexe em data/ nem em .env
  for (const pasta of ['server', 'shared', 'web', 'scripts', 'docs']) rmSync(join(destino, pasta), { recursive: true, force: true });
  rmSync(join(destino, 'web', 'dist'), { recursive: true, force: true });
}

cpSync(APP, destino, {
  recursive: true,
  filter: (origem) => {
    const rel = origem.slice(APP.length + 1).replaceAll('\\', '/');
    if (atualizando && (rel === 'data' || rel.startsWith('data/') || rel === '.env')) return false;
    return !/(^|\/)(node_modules|dist|\.DS_Store)(\/|$)/.test(rel);
  },
});

console.log(`\n${atualizando ? 'Código atualizado' : 'Projeto criado'} em ${destino}`);

if (flags.has('--install')) {
  console.log('\nInstalando dependências e gerando a interface (pode levar 1-2 minutos)...\n');
  if (!run('npm', ['install'])) {
    console.error('\nFalha no npm install. Confira se o Node.js 22.16+ está instalado (node -v).');
    process.exit(1);
  }
}

if (flags.has('--git') && !atualizando) {
  if (!existsSync(join(destino, '.git'))) run('git', ['init']);
  run('git', ['add', '-A']);
  run('git', ['commit', '-m', 'feat: sistema de fila presencial (Node + SQLite)']);
}

console.log(`
Próximos passos:
  cd "${destino}"
  ${flags.has('--install') ? '' : 'npm install\n  '}npm start
Depois abra o endereço mostrado no terminal e vá em /config para personalizar cores, logotipo e vídeos.
Guia completo: docs/instalacao.html
`);
