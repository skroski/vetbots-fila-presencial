// Backup manual do banco:  npm run backup   →  data/backups/manual-AAAA-MM-DD.db
import '../server/env.js';
const { fazerBackup } = await import('../server/backup.js');

const arquivo = await fazerBackup({ prefixo: 'manual', manter: 30 });
console.log(`Backup salvo em: ${arquivo}`);
