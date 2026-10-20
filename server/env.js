// Verifica a versão do Node e lê o arquivo .env (se existir) ANTES de o resto do servidor carregar.
// Importe este módulo primeiro.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile?.(join(dirname(fileURLToPath(import.meta.url)), '..', '.env'));
} catch {
  /* sem .env: usa os padrões */
}

// O banco usa o SQLite embutido no Node (node:sqlite), disponível a partir do Node 22.16.
const [maior, menor] = process.versions.node.split('.').map(Number);
if (maior < 22 || (maior === 22 && menor < 16)) {
  console.error(
    `\n  Este computador tem o Node.js v${process.versions.node}, que é antigo demais.\n` +
      '  Instale o Node.js 22.16 ou superior (versão LTS) em https://nodejs.org e tente de novo.\n',
  );
  process.exit(1);
}
