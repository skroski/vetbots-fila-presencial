// Gera os MP3 da narração do tour guiado (docs/instalacao.html) com o Fish Audio.
// É uma tarefa explícita de quem mantém o guia: o cliente final NUNCA precisa de chave,
// porque os MP3 já acompanham o pacote em docs/open-help/v<versão>/.
//
//   npm run help:audio                      gera só os MP3 que faltam
//   npm run help:audio -- --step=tv --force regera um passo
//   npm run help:audio -- --force           regera todos
//
// Chave e voz ficam no arquivo .env (ignorado pelo Git), nunca no código:
//   FISH_AUDIO_API_KEY=...  FISH_AUDIO_REFERENCE_ID=...  FISH_AUDIO_MODEL=s2.1-pro-free
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(raiz, 'docs');

if (existsSync(join(raiz, '.env'))) process.loadEnvFile(join(raiz, '.env'));

const args = process.argv.slice(2);
const force = args.includes('--force');
const so = args.find((a) => a.startsWith('--step='))?.slice(7);

const chave = process.env.FISH_AUDIO_API_KEY?.trim();
const voz = process.env.FISH_AUDIO_REFERENCE_ID?.trim();
const modelo = process.env.FISH_AUDIO_MODEL?.trim() || 's2.1-pro-free';

function falha(msg) { console.error(`✖ ${msg}`); process.exit(1); }
if (!chave) falha('Defina FISH_AUDIO_API_KEY no arquivo .env (veja .env.example).');

// Lê o roteiro direto do guia: texto e narração têm uma fonte só.
const html = readFileSync(join(docs, 'instalacao.html'), 'utf8');
const bloco = html.match(/\/\* JOURNEY:INICIO \*\/([\s\S]*?)\/\* JOURNEY:FIM \*\//)?.[1];
if (!bloco) falha('Bloco JOURNEY:INICIO/FIM não encontrado em docs/instalacao.html.');
const journey = vm.runInNewContext(`${bloco}\nJOURNEY`, {}, { timeout: 1000 });

const passos = journey.steps.filter((s) => !so || s.id === so);
if (!passos.length) falha(`Passo "${so}" não existe. Passos: ${journey.steps.map((s) => s.id).join(', ')}`);

async function sintetizar(texto) {
  const corpo = {
    text: texto,
    ...(voz ? { reference_id: voz } : {}),
    format: 'mp3',
    sample_rate: 44100,
    mp3_bitrate: 128,
    latency: 'normal',
    temperature: 0.7,
    top_p: 0.7,
    chunk_length: 200,
    normalize: true,
    language: journey.language,
    prosody: { speed: 1, volume: 0, normalize_loudness: true },
  };
  const r = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json', model: modelo },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) {
    const dica = { 401: 'chave inválida', 402: 'sem créditos na conta', 422: 'parâmetro recusado (voz ou texto)', 429: 'limite de uso, tente em instantes' }[r.status] ?? 'erro do serviço';
    throw new Error(`Fish Audio respondeu ${r.status} (${dica}).`);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 1024) throw new Error('Fish Audio devolveu um áudio vazio.');
  return buf;
}

let feitos = 0, pulados = 0;
for (const passo of passos) {
  if (!passo.audioSrc || !passo.narration) continue;
  const destino = join(docs, passo.audioSrc);
  if (existsSync(destino) && !force) { console.log(`• ${passo.id}: já existe (use --force para regerar)`); pulados++; continue; }
  mkdirSync(dirname(destino), { recursive: true });
  const tmp = `${destino}.parcial`;
  try {
    console.log(`… ${passo.id}: gerando`);
    writeFileSync(tmp, await sintetizar(passo.narration));
    renameSync(tmp, destino);                     // só aparece o arquivo completo
    console.log(`✔ ${passo.id}: ${passo.audioSrc}`);
    feitos++;
  } catch (e) {
    rmSync(tmp, { force: true });
    falha(`${passo.id}: ${e.message}`);
  }
}
console.log(`\nPronto: ${feitos} gerado(s), ${pulados} já existente(s). Ouça os arquivos antes de publicar.`);
