// Gerador leve e autônomo de QR Code em SVG puro (sem pacotes externos).
// Baseado no padrão ISO/IEC 18004 (código QR versão 1 a 4, correção de erro Low/Medium).
// Ideal para codificar URLs curtas (como http://fila.local:3000/tv ou http://192.168.0.10:3000/totem).

type QrMatrix = boolean[][];

// Tabelas Galois Field GF(256) com primitiva 0x11d (285)
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
let x = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = x;
  EXP[i + 255] = x;
  LOG[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}

function gfMult(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function geradorPolinomio(grau: number): number[] {
  let poly = [1];
  for (let i = 0; i < grau; i++) {
    const proximo = new Array(poly.length + 1).fill(0);
    const fator = EXP[i];
    for (let j = 0; j < poly.length; j++) {
      proximo[j] ^= poly[j];
      proximo[j + 1] ^= gfMult(poly[j], fator);
    }
    poly = proximo;
  }
  return poly;
}

function calcularCodigosCorrecao(dados: number[], numCorrecao: number): number[] {
  const gen = geradorPolinomio(numCorrecao);
  const resto = new Array(dados.length + numCorrecao).fill(0);
  for (let i = 0; i < dados.length; i++) resto[i] = dados[i];
  for (let i = 0; i < dados.length; i++) {
    const coef = resto[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        resto[i + j] ^= gfMult(gen[j], coef);
      }
    }
  }
  return resto.slice(dados.length);
}

// Configuração por versão de QR (V1 a V6, nível L e M)
// V1 = 21x21, V2 = 25x25, V3 = 29x29, V4 = 33x33, V5 = 37x37, V6 = 41x41
const VERSOES = [
  { versao: 1, tamanho: 21, totalBytes: 26, dadosBytesL: 19, ecBytes: 7 },
  { versao: 2, tamanho: 25, totalBytes: 44, dadosBytesL: 34, ecBytes: 10 },
  { versao: 3, tamanho: 29, totalBytes: 70, dadosBytesL: 55, ecBytes: 15 },
  { versao: 4, tamanho: 33, totalBytes: 100, dadosBytesL: 80, ecBytes: 20 },
  { versao: 5, tamanho: 37, totalBytes: 134, dadosBytesL: 108, ecBytes: 26 },
  { versao: 6, tamanho: 41, totalBytes: 172, dadosBytesL: 136, ecBytes: 18 * 2 },
];

function codificarBytes(texto: string): { versaoInfo: typeof VERSOES[0]; dados: number[] } {
  const utf8 = new TextEncoder().encode(texto);
  const len = utf8.length;
  const cfg = VERSOES.find((v) => len <= v.dadosBytesL - 3);
  if (!cfg) throw new Error('Texto longo demais para o gerador de QR code embutido.');

  // Modo byte (0100) + contador de tamanho (8 bits para V1-V9)
  const bits: number[] = [0, 1, 0, 0];
  for (let i = 7; i >= 0; i--) bits.push((len >> i) & 1);
  for (const byte of utf8) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  }
  // Terminador (até 4 zeros)
  const totalBits = cfg.dadosBytesL * 8;
  while (bits.length < totalBits && bits.length % 8 !== 0) bits.push(0);
  while (bits.length < totalBits && bits.length < totalBits) {
    if (bits.length + 4 <= totalBits) bits.push(0, 0, 0, 0);
    else bits.push(0);
    break;
  }
  while (bits.length % 8 !== 0) bits.push(0);

  // Bytes de padding padrão 0xEC, 0x11
  const bytesDados: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    bytesDados.push(b);
  }
  let pad = 0xec;
  while (bytesDados.length < cfg.dadosBytesL) {
    bytesDados.push(pad);
    pad = pad === 0xec ? 0x11 : 0xec;
  }

  const ec = calcularCodigosCorrecao(bytesDados, cfg.totalBytes - cfg.dadosBytesL);
  return { versaoInfo: cfg, dados: bytesDados.concat(ec) };
}

export function gerarMatrizQr(texto: string): QrMatrix {
  const { versaoInfo, dados } = codificarBytes(texto);
  const n = versaoInfo.tamanho;
  const matriz: (boolean | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null));

  // Desenha os 3 marcadores de posição (olhos 7x7)
  const desenharOlho = (r0: number, c0: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          matriz[rr][cc] = false;
        } else if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matriz[rr][cc] = true;
        } else {
          matriz[rr][cc] = false;
        }
      }
    }
  };
  desenharOlho(0, 0);
  desenharOlho(0, n - 7);
  desenharOlho(n - 7, 0);

  // Padrão de alinhamento para V2 em diante (em [n-7, n-7])
  if (versaoInfo.versao >= 2) {
    const r0 = n - 7;
    const c0 = n - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        matriz[r0 + r][c0 + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
      }
    }
  }

  // Linhas de sincronização (timing)
  for (let i = 8; i < n - 8; i++) {
    if (matriz[6][i] === null) matriz[6][i] = i % 2 === 0;
    if (matriz[i][6] === null) matriz[i][6] = i % 2 === 0;
  }
  // Ponto escuro obrigatório
  matriz[4 * versaoInfo.versao + 9][8] = true;

  // Informação de formato (nível L, máscara 000: bits padrão)
  // Formato para L / máscara 0 = 0x77c4 -> bits 111011111000100
  const formatoBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  const coordsFormato: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = coordsFormato[i];
    matriz[r][c] = formatoBits[i] === 1;
  }
  for (let i = 0; i < 8; i++) matriz[n - 1 - i][8] = formatoBits[i] === 1;
  for (let i = 8; i < 15; i++) matriz[8][n - 15 + i] = formatoBits[i] === 1;

  // Preenche dados com máscara (r + c) % 2 === 0 (máscara 000)
  const todosBits: number[] = [];
  for (const b of dados) {
    for (let i = 7; i >= 0; i--) todosBits.push((b >> i) & 1);
  }
  // Restante com zeros
  while (todosBits.length < n * n) todosBits.push(0);

  let bitIdx = 0;
  let subindo = true;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--; // pula linha de timing vertical
    const linhas = subindo
      ? Array.from({ length: n }, (_, i) => n - 1 - i)
      : Array.from({ length: n }, (_, i) => i);

    for (const r of linhas) {
      for (const c of [col, col - 1]) {
        if (matriz[r][c] === null) {
          const bit = bitIdx < todosBits.length ? todosBits[bitIdx++] : 0;
          const mascara = (r + c) % 2 === 0;
          matriz[r][c] = (bit ^ (mascara ? 1 : 0)) === 1;
        }
      }
    }
    subindo = !subindo;
  }

  return matriz.map((row) => row.map((cell) => cell ?? false));
}

/** Renderiza a matriz em string SVG compacta e nítida. */
export function qrCodeParaSvg(texto: string, tamanho = 200): string {
  try {
    const matriz = gerarMatrizQr(texto);
    const n = matriz.length;
    const margem = 2;
    const total = n + margem * 2;
    let paths = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matriz[r][c]) {
          paths += `M${c + margem},${r + margem}h1v1h-1z `;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${tamanho}" height="${tamanho}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/><path d="${paths.trim()}" fill="#000000"/></svg>`;
  } catch (e) {
    console.error('Falha ao gerar QR Code:', e);
    return '';
  }
}
