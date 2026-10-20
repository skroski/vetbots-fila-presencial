// Backup do banco: cópia consistente do SQLite (funciona com o sistema em uso).
import { mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { copiarBanco, DATA_DIR, diaLocal } from './db.js';

export const BACKUPS_DIR = join(DATA_DIR, 'backups');

/** Grava data/backups/<prefixo>-AAAA-MM-DD.db e mantém só os `manter` mais recentes desse prefixo. */
export async function fazerBackup({ prefixo = 'manual', manter = 30 } = {}) {
  mkdirSync(BACKUPS_DIR, { recursive: true });
  const destino = join(BACKUPS_DIR, `${prefixo}-${diaLocal()}.db`);
  await copiarBanco(destino);
  const antigos = readdirSync(BACKUPS_DIR)
    .filter((f) => f.startsWith(`${prefixo}-`) && f.endsWith('.db'))
    .sort()
    .reverse()
    .slice(manter);
  for (const f of antigos) rmSync(join(BACKUPS_DIR, f), { force: true });
  return destino;
}

/** Backup automático diário (uma cópia por dia, guarda 14). Roda ao iniciar e a cada 6 h. */
export function agendarBackupDiario() {
  const rodar = async () => {
    try {
      const hoje = join(BACKUPS_DIR, `auto-${diaLocal()}.db`);
      if (!existsSync(hoje)) await fazerBackup({ prefixo: 'auto', manter: 14 });
    } catch (e) {
      console.error('[backup] falhou:', e.message);
    }
  };
  void rodar();
  setInterval(rodar, 6 * 3600 * 1000).unref();
}
