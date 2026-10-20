// Cria pacientes de exemplo na fila (para testar as telas/TV). Uso: npm run demo
// Com o servidor rodando; outra porta: PORT=3100 npm run demo
const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const post = async (rota, corpo) => {
  const r = await fetch(base + rota, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error(`${rota}: ${(await r.json()).erro}`);
  return r.json();
};

const { servicos, salas } = await (await fetch(`${base}/api/state`)).json();
const por = (p) => servicos.find((s) => s.prefixo === p).id;

const exemplos = [
  ['A', 'Mariana Souza', 'Thor', 'normal'],
  ['A', 'Carlos Lima', 'Luna', 'normal'],
  ['C', 'Paula Ribeiro', 'Bolinha', 'normal'],
  ['B', 'Ana Preferencial', 'Mel', 'prioridade'],
  ['X', 'Roberto Urgente', 'Rex', 'emergencia'],
  ['E', 'Juliana Alves', 'Nina', 'normal'],
];
for (const [p, tutor, pet, prioridade] of exemplos) {
  const i = await post('/api/itens', { servicoId: por(p), tutorNome: tutor, petNome: pet, prioridade, veterinarioNome: 'Dra. Camila' });
  console.log(`Senha ${i.senha} → ${tutor} (${pet})`);
}
// uma chamada, para a TV ter o que mostrar
const chamado = await post(`/api/salas/${salas[0].id}/chamar-proximo`, {});
console.log(`Chamado: ${chamado.senha} para ${salas[0].nome}`);
