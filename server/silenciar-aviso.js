// O node:sqlite ainda é marcado como "experimental" no Node 22 e imprime um aviso a cada inicialização.
// Escondemos só esse aviso (os demais continuam aparecendo).
const original = process.emitWarning;
process.emitWarning = function (aviso, ...resto) {
  if (String(aviso?.message ?? aviso).includes('SQLite is an experimental')) return;
  return original.call(this, aviso, ...resto);
};
