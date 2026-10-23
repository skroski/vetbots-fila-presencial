// Configurações editáveis pela tela /config (nome, cores, logotipo, opções da TV...).
// Ficam na tabela `config`, então mudam em tempo real, sem rebuild e sem editar arquivos.
import { db, transacao } from './db.js';
import { HttpError } from './http-error.js';

export const COR_PADRAO = '#2294aa';

// tipo: 'texto' | 'bool' | 'int' | 'cor' | 'enum'
const SCHEMA = {
  clinic_name: { tipo: 'texto', padrao: 'Clínica Veterinária', max: 80 },
  clinic_subtitle: { tipo: 'texto', padrao: 'Painel de Atendimento Presencial', max: 80 },
  brand_color: { tipo: 'cor', padrao: COR_PADRAO },
  logo_file: { tipo: 'texto', padrao: '', max: 120, interno: true },
  show_brand_text: { tipo: 'bool', padrao: false },
  tv_sound: { tipo: 'bool', padrao: true },
  tv_privacy: { tipo: 'bool', padrao: false },
  tv_layout: { tipo: 'enum', padrao: 'lateral', opcoes: ['lateral', 'tela_cheia', 'video_16_9'] },
  tv_video_muted: { tipo: 'bool', padrao: true },
  tv_overlay_seconds: { tipo: 'int', padrao: 12, min: 4, max: 60 },
  ticket_footer: { tipo: 'texto', padrao: 'Acompanhe pelo telão da sala de espera.', max: 120 },
  ticket_show_logo: { tipo: 'bool', padrao: true },
  ticket_width_mm: { tipo: 'enum', padrao: '58', opcoes: ['58', '80'] },
  reset_daily: { tipo: 'bool', padrao: true },
};

function parse(chave, bruto) {
  const def = SCHEMA[chave];
  if (bruto === undefined) return def.padrao;
  if (def.tipo === 'bool') return bruto === 'true';
  if (def.tipo === 'int') return Number.parseInt(bruto, 10) || def.padrao;
  return bruto;
}

export function lerConfig() {
  const rows = db.prepare('select chave, valor from config').all();
  const salvo = Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
  return Object.fromEntries(Object.keys(SCHEMA).map((k) => [k, parse(k, salvo[k])]));
}

export function validarEGravar(parcial) {
  if (!parcial || typeof parcial !== 'object') throw new HttpError(400, 'Corpo inválido.');
  const gravar = db.prepare(
    'insert into config (chave, valor) values (?, ?) on conflict(chave) do update set valor = excluded.valor',
  );
  transacao(() => {
    for (const [chave, valor] of Object.entries(parcial)) {
      const def = SCHEMA[chave];
      if (!def || def.interno) continue; // ignora chaves desconhecidas e as controladas pelo servidor
      let texto;
      switch (def.tipo) {
        case 'texto':
          texto = String(valor ?? '').trim().slice(0, def.max);
          if (chave === 'clinic_name' && !texto) throw new HttpError(400, 'Informe o nome da clínica.');
          break;
        case 'bool':
          texto = valor === true || valor === 'true' ? 'true' : 'false';
          break;
        case 'int': {
          const n = Number.parseInt(valor, 10);
          if (!Number.isFinite(n)) throw new HttpError(400, `Valor inválido para ${chave}.`);
          texto = String(Math.min(def.max, Math.max(def.min, n)));
          break;
        }
        case 'cor':
          if (!/^#[0-9a-fA-F]{6}$/.test(String(valor))) throw new HttpError(400, 'Cor inválida (use #RRGGBB).');
          texto = String(valor).toLowerCase();
          break;
        case 'enum':
          if (!def.opcoes.includes(String(valor))) throw new HttpError(400, `Valor inválido para ${chave}.`);
          texto = String(valor);
          break;
      }
      gravar.run(chave, texto);
    }
  });
  return lerConfig();
}

export function gravarInterno(chave, valor) {
  db.prepare(
    'insert into config (chave, valor) values (?, ?) on conflict(chave) do update set valor = excluded.valor',
  ).run(chave, valor);
}
