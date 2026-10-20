// Ponto de entrada:  npm start  →  http://IP-DO-COMPUTADOR:3000
// A checagem da versão do Node vem ANTES do carregamento do servidor (importação dinâmica):
// em um Node antigo, o módulo node:sqlite nem existe e o erro seria incompreensível.
import './env.js';
await import('./servidor.js');
