#!/usr/bin/env node
// install.mjs: instala ou atualiza esta skill nos agentes de IA desta máquina
// Compatível com Claude Code, Codex, Antigravity e Gemini CLI.
//
// Uso:
//   node scripts/install.mjs                 # instala em todos os agentes detectados
//   node scripts/install.mjs claude codex    # instala apenas nos alvos escolhidos
//   node scripts/install.mjs --list          # lista onde a skill está instalada
//   node scripts/install.mjs --uninstall     # remove a skill

import { cpSync, existsSync, lstatSync, mkdirSync, rmSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const NAME = 'sistema-fila-presencial';
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOME = homedir();

const has = (cmd) =>
  spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' }).status === 0;
const exists = (...p) => existsSync(join(HOME, ...p));

const TARGETS = {
  claude: {
    label: 'Claude Code',
    dir: join(HOME, '.claude', 'skills'),
    found: () => exists('.claude') || has('claude'),
  },
  agents: {
    label: '.agents Global (Codex / Cursor / AGY)',
    dir: join(HOME, '.agents', 'skills'),
    found: () => true,
  },
  codex: {
    label: 'Codex (~/.codex)',
    dir: join(HOME, '.codex', 'skills'),
    found: () => exists('.codex'),
  },
  gemini: {
    label: 'Gemini / Antigravity config',
    dir: join(HOME, '.gemini', 'config', 'skills'),
    found: () => exists('.gemini', 'config', 'skills'),
  },
};

if (!existsSync(join(SRC, 'SKILL.md'))) {
  console.error(`SKILL.md não encontrado em ${SRC}. Execute dentro da pasta da skill.`);
  process.exit(1);
}

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
let names = argv.filter((a) => !a.startsWith('--')).map((a) => a.toLowerCase());

if (names.includes('all')) names = Object.keys(TARGETS);

if (flags.has('--list')) {
  console.log(`\nVerificando instalação de "${NAME}":`);
  const dirs = [...new Set(Object.values(TARGETS).map((t) => t.dir))];
  for (const d of dirs) {
    const installed = existsSync(join(d, NAME, 'SKILL.md'));
    console.log(`${installed ? '  ✓ Instalado:' : '  · Não instalado:'} ${join(d, NAME)}`);
  }
  process.exit(0);
}

if (!names.length) {
  names = Object.keys(TARGETS).filter((n) => TARGETS[n].found());
  if (!names.length) {
    names = ['agents'];
    console.log('Nenhum agente específico detectado: instalando em ~/.agents/skills (padrão aberto).');
  } else {
    console.log(`\nAgentes detectados: ${names.map((n) => TARGETS[n].label).join(', ')}`);
  }
}

const same = (a, b) => {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return false;
  }
};

const skip = (p) => /(^|[\\/])(node_modules|\.DS_Store|\.git)$/.test(p);

function install(dir) {
  const dest = join(dir, NAME);
  if (same(SRC, dest)) {
    console.log(`  = ${dest} (origem idêntica ao destino; nada a fazer)`);
    return;
  }
  if (existsSync(dest) && lstatSync(dest).isSymbolicLink()) {
    console.log(`  ! ${dest} é um link simbólico; não modificado`);
    return;
  }
  mkdirSync(dir, { recursive: true });
  rmSync(dest, { recursive: true, force: true });
  cpSync(SRC, dest, { recursive: true, filter: (p) => !skip(p) });
  console.log(`  ✓ Instalado com sucesso em: ${dest}`);
}

function uninstall(dir) {
  const dest = join(dir, NAME);
  if (!existsSync(dest)) return;
  rmSync(dest, { recursive: true, force: true });
  console.log(`  ✕ Removido de: ${dest}`);
}

const action = flags.has('--uninstall') ? uninstall : install;
for (const n of names) {
  if (TARGETS[n]) action(TARGETS[n].dir);
}

console.log(`\nPronto! A skill "${NAME}" está disponível para uso.`);
