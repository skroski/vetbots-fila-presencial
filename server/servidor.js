// Servidor da Fila Presencial (carregado por server/index.js depois da checagem da versão do Node).
import { networkInterfaces } from 'node:os';
import { app, clientes, semBuild, ADMIN_PIN } from './app.js';
import { db, DB_FILE, DATA_DIR } from './db.js';
import { limparParciais } from './media.js';
import { agendarBackupDiario } from './backup.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

await limparParciais();
agendarBackupDiario();

const enderecosLan = () =>
  Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);

const server = app.listen(PORT, HOST, () => {
  const ips = enderecosLan();
  const base = ips[0] || 'localhost';
  console.log('\n  Fila Presencial no ar!  (Ctrl+C para parar)\n');
  console.log(`  Banco de dados: ${DB_FILE}`);
  console.log(`  Dados/uploads:  ${DATA_DIR}`);
  console.log(`  Backup diário:  ${DATA_DIR}/backups (automático)`);
  if (ADMIN_PIN) console.log('  Ajustes protegidos por PIN (ADMIN_PIN).');
  const hostLocal = (process.env.HOSTNAME || '').replace(/\.local$/i, '') || 'fila';
  console.log(`\n  Endereço amigável (sem IP):    http://${hostLocal}.local:${PORT}`);
  console.log(`  Endereço por IP na rede:       http://${base}:${PORT}\n`);
  console.log('  Abra nos aparelhos da clínica (mesma rede Wi-Fi/cabo):\n');
  const telas = [
    ['Recepção / triagem', '/'],
    ['Telão da TV', '/tv'],
    ['Chamador do consultório', '/chamar'],
    ['Totem de autoatendimento', '/totem'],
    ['Métricas', '/metricas'],
    ['Ajustes (cores, logo, vídeos)', '/config'],
  ];
  for (const [nome, rota] of telas) console.log(`   ${nome.padEnd(32)} http://${base}:${PORT}${rota}`);
  if (ips.length > 1) console.log(`\n  Outros IPs deste computador: ${ips.slice(1).join(', ')}`);
  if (semBuild) console.log('\n  ATENÇÃO: interface não gerada. Rode "npm run build" e reinicie.');
  console.log('');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`\n  A porta ${PORT} já está em uso. Feche o outro programa ou rode com outra porta: PORT=3001 npm start\n`);
  else console.error(e);
  process.exit(1);
});

// Uploads de vídeo grandes pelo Wi-Fi podem passar de 5 min: sem limite de tempo na requisição.
server.requestTimeout = 0;

const encerrar = () => {
  for (const res of clientes) res.end();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
