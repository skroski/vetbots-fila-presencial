import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  Download,
  DoorOpen,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  ImagePlus,
  Lock,
  Palette,
  Pencil,
  Plus,
  QrCode,
  Server,
  Stethoscope,
  Tag,
  Trash2,
  Tv,
  Upload,
  X,
  Youtube,
} from 'lucide-react';
import { useQueueSystem } from '@/hooks/useQueueSystem';
import { api, ApiError, enviarArquivo, getAdminPin, setAdminPin } from '@/lib/api';
import { aplicarTemaTemporario, refresh } from '@/lib/store';
import { qrCodeParaSvg } from '@/lib/qrcode';
import BrandMark from '@/components/BrandMark';
import type { AppConfig, Media } from '@/types/queue';

type Aba = 'marca' | 'tv' | 'rooms' | 'vets' | 'services' | 'sistema';

const CORES_PRONTAS = [
  { nome: 'VetBots', hex: '#2294aa' },
  { nome: 'Marrom', hex: '#93551f' },
  { nome: 'Esmeralda', hex: '#10b981' },
  { nome: 'Azul', hex: '#2563eb' },
  { nome: 'Turquesa', hex: '#0d9488' },
  { nome: 'Roxo', hex: '#7c3aed' },
  { nome: 'Rosa', hex: '#db2777' },
  { nome: 'Laranja', hex: '#ea580c' },
  { nome: 'Vermelho', hex: '#dc2626' },
  { nome: 'Dourado', hex: '#ca8a04' },
];

const campo = 'input input-bordered w-full';
const cartao = 'card bg-base-100 border border-base-300 shadow-soft p-6 space-y-4';
const botaoPrimario = 'btn btn-primary';
const botaoDiscreto = 'btn btn-ghost btn-sm';

const erroDe = (e: unknown) => (e instanceof Error ? e.message : 'Algo deu errado.');

function formatarTamanho(bytes: number) {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(bytes / 1048576))} MB`;
}

// ---------- Porta de entrada (PIN opcional) ----------

function PortaPin({ onLiberado }: { onLiberado: () => void }) {
  const [pin, setPin] = useState('');
  const [carregando, setCarregando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    try {
      setAdminPin(pin);
      await api('POST', '/api/auth/verificar', { pin });
      onLiberado();
    } catch (err) {
      setAdminPin('');
      toast.error(erroDe(err));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex items-center justify-center p-6">
      <form onSubmit={entrar} className={`${cartao} w-full max-w-sm text-center`}>
        <Lock className="h-8 w-8 mx-auto text-accent" />
        <h1 className="text-lg font-bold text-base-content">Ajustes protegidos</h1>
        <p className="text-xs text-neutral">Digite o PIN de administrador definido para este sistema.</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className={`${campo} text-center `}
          placeholder="PIN"
        />
        <button type="submit" disabled={!pin || carregando} className={`${botaoPrimario} w-full justify-center`}>
          Entrar
        </button>
        <a href="/" className="block text-xs text-neutral hover:text-base-content/80">
          Voltar à recepção
        </a>
      </form>
    </div>
  );
}

// ---------- Aba: aparência ----------

function AbaMarca({ config }: { config: AppConfig }) {
  const [nome, setNome] = useState(config.clinic_name);
  const [subtitulo, setSubtitulo] = useState(config.clinic_subtitle);
  const [cor, setCor] = useState(config.brand_color);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const mudou = nome !== config.clinic_name || subtitulo !== config.clinic_subtitle || cor !== config.brand_color;

  // Pré-visualiza a cor ao vivo; ao sair sem salvar, volta à cor gravada.
  const gravada = useRef(config.brand_color);
  gravada.current = config.brand_color;
  useEffect(() => {
    aplicarTemaTemporario(cor);
  }, [cor]);
  useEffect(() => () => aplicarTemaTemporario(gravada.current), []);

  const salvar = async () => {
    setSalvando(true);
    try {
      await api('PUT', '/api/config', { clinic_name: nome, clinic_subtitle: subtitulo, brand_color: cor });
      await refresh();
      toast.success('Aparência salva. As telas abertas já atualizaram.');
    } catch (e) {
      toast.error(erroDe(e));
    } finally {
      setSalvando(false);
    }
  };

  const enviarLogo = async (file?: File) => {
    if (!file) return;
    setEnviando(true);
    try {
      await enviarArquivo('/api/logo', file);
      await refresh();
      toast.success('Logotipo atualizado.');
    } catch (e) {
      toast.error(erroDe(e));
    } finally {
      setEnviando(false);
      if (arquivoRef.current) arquivoRef.current.value = '';
    }
  };

  const removerLogo = async () => {
    try {
      await api('DELETE', '/api/logo');
      await refresh();
      toast.success('Logotipo removido.');
    } catch (e) {
      toast.error(erroDe(e));
    }
  };

  return (
    <div className="space-y-6">
      <div className={cartao}>
        <h2 className="text-sm font-bold text-base-content">Identidade da clínica</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-neutral">
            Nome da clínica
            <input className={campo} maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>
          <label className="space-y-1 text-xs text-neutral">
            Subtítulo (usado nos textos ao lado do logotipo)
            <input className={campo} maxLength={80} value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <div className="card h-24 min-w-24 bg-base-100 border border-base-300 flex-row items-center justify-center px-4">
            <BrandMark size="lg" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-neutral">Logotipo: PNG, JPG, WebP ou SVG, até 5 MB. Fundo transparente fica melhor na TV.</p>
            <div className="flex gap-2">
              <input
                ref={arquivoRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => enviarLogo(e.target.files?.[0])}
              />
              <button className={botaoDiscreto} disabled={enviando} onClick={() => arquivoRef.current?.click()}>
                <ImagePlus className="h-4 w-4" />
                {enviando ? 'Enviando...' : config.logo_url ? 'Trocar logotipo' : 'Enviar logotipo'}
              </button>
              {config.logo_url && (
                <button className={botaoDiscreto} onClick={removerLogo}>
                  <Trash2 className="h-4 w-4" />
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>

        <Interruptor
          ativo={config.show_brand_text}
          onChange={(v) => salvarConfig({ show_brand_text: v })}
          titulo="Mostrar textos ao lado do logotipo"
          detalhe="Recepção e TV exibem o nome e o subtítulo da clínica junto ao logotipo. Desligado, aparece só o logotipo."
        />
      </div>

      <div className={cartao}>
        <h2 className="text-sm font-bold text-base-content">Cor da marca</h2>
        <p className="text-xs text-neutral">
          Escolha uma cor: botões, destaques, senha da TV e totem se ajustam sozinhos (tons claros e escuros são gerados).
        </p>
        <div className="flex flex-wrap gap-2">
          {CORES_PRONTAS.map((c) => (
            <button
              key={c.hex}
              title={c.nome}
              onClick={() => setCor(c.hex)}
              className={`h-9 w-9 rounded-full border-2 transition ${cor.toLowerCase() === c.hex ? 'border-base-content scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ background: c.hex }}
            >
              {cor.toLowerCase() === c.hex && <Check className="h-4 w-4 mx-auto text-base-content" />}
            </button>
          ))}
          <label className="flex items-center gap-2 text-xs text-neutral ml-2">
            Personalizada
            <input
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              className="h-9 w-12 rounded bg-transparent border border-base-300 cursor-pointer"
            />
            <code className="font-mono text-base-content/80">{cor}</code>
          </label>
        </div>

        <div className="card border border-base-300 bg-base-100 p-4 flex-row flex-wrap items-center gap-4">
          <span className="font-mono text-4xl font-black text-accent">A014</span>
          <span className="badge badge-soft-primary font-semibold">
            Chamada atual
          </span>
          <button className="btn btn-primary">Chamar Próximo</button>
          <span className="text-xs text-neutral">Pré-visualização</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className={botaoPrimario} disabled={!mudou || salvando} onClick={salvar}>
          <Check className="h-4 w-4" />
          {salvando ? 'Salvando...' : 'Salvar aparência'}
        </button>
        {mudou && (
          <button
            className={botaoDiscreto}
            onClick={() => {
              setNome(config.clinic_name);
              setSubtitulo(config.clinic_subtitle);
              setCor(config.brand_color);
            }}
          >
            Descartar
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Aba: TV e vídeos ----------

function Interruptor({
  ativo,
  onChange,
  titulo,
  detalhe,
}: {
  ativo: boolean;
  onChange: (v: boolean) => void;
  titulo: string;
  detalhe: string;
}) {
  return (
    <label className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg px-1 py-2 text-left transition duration-200 hover:bg-base-200">
      <span>
        <span className="block text-sm font-semibold text-base-content">{titulo}</span>
        <span className="block text-xs text-neutral">{detalhe}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="toggle toggle-primary shrink-0"
        checked={ativo}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

async function salvarConfig(parcial: Partial<AppConfig>, mensagem?: string) {
  try {
    await api('PUT', '/api/config', parcial);
    await refresh();
    if (mensagem) toast.success(mensagem);
  } catch (e) {
    toast.error(erroDe(e));
  }
}

const ehLinkYoutube = (t: string) => /(youtu\.be|youtube\.com|youtube-nocookie\.com)/i.test(t);

/** Miniatura de um vídeo do YouTube; sem internet no computador do administrador cai para um ícone. */
function MiniaturaYoutube({ id }: { id: string }) {
  const [falhou, setFalhou] = useState(false);
  return (
    <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-black">
      {falhou ? (
        <Youtube className="absolute inset-0 m-auto h-6 w-6 text-neutral" aria-hidden="true" />
      ) : (
        <img
          src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFalhou(true)}
        />
      )}
      <span className="absolute bottom-0.5 left-0.5 rounded bg-black/80 px-1 text-[10px] font-bold text-white">YouTube</span>
    </div>
  );
}

/** Desenho esquemático de cada layout da TV (aparece no cartão de escolha). */
function PreviaLayout({ tipo, tamanho }: { tipo: AppConfig['tv_layout']; tamanho: AppConfig['tv_video_size'] }) {
  const video = 'rounded-sm bg-primary/60';
  const texto = 'rounded-sm bg-base-content/70';
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md border border-base-300 bg-base-200" aria-hidden="true">
      {tipo === 'tela_cheia' && (
        <>
          <div className={`absolute inset-0 ${video} opacity-60`} />
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-base-100/90 px-2 py-1">
            <div className={`${texto} h-3 w-10`} />
            <div className="h-1.5 w-16 rounded-sm bg-base-content/40" />
          </div>
        </>
      )}
      {tipo === 'lateral' && (
        <div className="absolute inset-1 grid grid-cols-[3fr_2fr] gap-1">
          <div className={video} />
          <div className="flex flex-col items-center justify-center gap-1">
            <div className={`${texto} h-4 w-4/5`} />
            <div className="h-2 w-3/5 rounded-sm bg-base-content/40" />
            <div className="mt-1 h-2 w-4/5 rounded-sm bg-base-content/25" />
          </div>
        </div>
      )}
      {tipo === 'video_16_9' && (
        <div
          className={`absolute inset-1 grid gap-1 ${
            tamanho === '2_3'
              ? 'grid-cols-[1fr_2fr]'
              : tamanho === '1_2'
                ? 'grid-cols-2'
                : 'grid-cols-[2fr_1fr]'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-1 rounded-sm border border-primary/60">
            <div className={`${texto} ${tamanho === '2_3' ? 'h-3.5 w-4/5' : 'h-5 w-4/5'}`} />
            <div className="h-2 w-3/5 rounded-sm bg-base-content/40" />
          </div>
          <div className="flex flex-col gap-1">
            <div className={`${video} aspect-video w-full`} />
            <div className="h-2 rounded-sm bg-base-content/25" />
            <div className="h-2 rounded-sm bg-base-content/25" />
          </div>
        </div>
      )}
    </div>
  );
}

function AbaTv({ config, midias }: { config: AppConfig; midias: Media[] }) {
  const [progresso, setProgresso] = useState<{ nome: string; pct: number } | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState('');
  const [adicionando, setAdicionando] = useState(false);

  const adicionarYoutube = async (texto: string) => {
    const url = texto.trim();
    if (!url || adicionando) return;
    setAdicionando(true);
    try {
      const novo = await api<Media>('POST', '/api/midias/youtube', { url });
      setLink('');
      await refresh();
      toast.success('Vídeo do YouTube adicionado à playlist.');
      // Melhoria opcional: pega o título do vídeo (o navegador de quem administra pode estar offline; sem título, vale o nome padrão).
      try {
        const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(novo.url)}&format=json`);
        const titulo = r.ok ? ((await r.json()) as { title?: string }).title : '';
        if (titulo) {
          await api('PATCH', `/api/midias/${novo.id}`, { nome: titulo });
          await refresh();
        }
      } catch {
        /* sem título: continua com o nome padrão */
      }
    } catch (e) {
      toast.error(erroDe(e));
    }
    setAdicionando(false);
  };

  const renomear = async (m: Media) => {
    const nome = prompt('Novo nome do vídeo:', m.nome)?.trim();
    if (!nome || nome === m.nome) return;
    try {
      await api('PATCH', `/api/midias/${m.id}`, { nome });
      await refresh();
    } catch (e) {
      toast.error(erroDe(e));
    }
  };

  const enviar = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      try {
        setProgresso({ nome: file.name, pct: 0 });
        await enviarArquivo('/api/midias', file, (pct) => setProgresso({ nome: file.name, pct }));
        await refresh();
        toast.success(`"${file.name}" adicionado à playlist.`);
      } catch (e) {
        toast.error(`${file.name}: ${erroDe(e)}`);
      }
    }
    setProgresso(null);
    if (arquivoRef.current) arquivoRef.current.value = '';
  };

  const mover = async (indice: number, delta: number) => {
    const ids = midias.map((m) => m.id);
    const alvo = indice + delta;
    if (alvo < 0 || alvo >= ids.length) return;
    [ids[indice], ids[alvo]] = [ids[alvo], ids[indice]];
    try {
      await api('POST', '/api/midias/ordem', { ids });
      await refresh();
    } catch (e) {
      toast.error(erroDe(e));
    }
  };

  const alternar = async (m: Media) => {
    try {
      await api('PATCH', `/api/midias/${m.id}`, { ativo: !m.ativo });
      await refresh();
    } catch (e) {
      toast.error(erroDe(e));
    }
  };

  const excluir = async (m: Media) => {
    if (!confirm(m.tipo === 'youtube' ? `Remover "${m.nome}" da playlist?` : `Excluir o vídeo "${m.nome}" definitivamente?`)) return;
    try {
      await api('DELETE', `/api/midias/${m.id}`);
      await refresh();
      toast.success('Vídeo excluído.');
    } catch (e) {
      toast.error(erroDe(e));
    }
  };

  const ativos = midias.filter((m) => m.ativo).length;

  return (
    <div className="space-y-6">
      <div className={cartao}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-base-content">Vídeos da sala de espera</h2>
          <a href="/tv" target="_blank" rel="noreferrer" className={botaoDiscreto}>
            <Tv className="h-4 w-4" />
            Abrir a TV
          </a>
        </div>
        <p className="text-xs text-neutral">
          Os vídeos tocam em sequência e em loop na TV, sem parar. Envie um arquivo{' '}
          <strong className="text-base-content">MP4 (H.264 + AAC), 1080p</strong>, que toca mesmo sem internet, ou cole um link do YouTube.
          Sem vídeos ativos, a TV mostra só o painel de chamadas.
        </p>

        <input
          ref={arquivoRef}
          type="file"
          multiple
          accept=".mp4,.m4v,.webm,video/mp4,video/webm"
          className="hidden"
          onChange={(e) => enviar(e.target.files)}
        />
        <button className={botaoPrimario} disabled={!!progresso} onClick={() => arquivoRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Enviar vídeos (MP4)
        </button>

        <form
          className="space-y-2 rounded-lg border border-base-300 bg-base-200/50 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void adicionarYoutube(link);
          }}
        >
          <label htmlFor="link-youtube" className="flex items-center gap-2 text-xs font-semibold text-base-content">
            <Youtube className="h-4 w-4" aria-hidden="true" />
            Ou cole o link de um vídeo do YouTube
          </label>
          <div className="flex gap-2">
            <input
              id="link-youtube"
              type="url"
              inputMode="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onPaste={(e) => {
                const colado = e.clipboardData.getData('text');
                if (ehLinkYoutube(colado)) {
                  e.preventDefault();
                  void adicionarYoutube(colado); // colou um link do YouTube: já entra na playlist
                }
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="input input-bordered input-sm flex-1"
              disabled={adicionando}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={adicionando || !link.trim()}>
              {adicionando ? <span className="loading loading-spinner loading-xs" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </button>
          </div>
          <p className="text-xs text-neutral">
            Ao colar o link, o vídeo já entra na playlist. Vídeos do YouTube precisam de internet na TV e só tocam se o dono permitir
            a exibição em outros sites.
          </p>
        </form>

        {progresso && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-neutral">
              <span className="truncate">Enviando {progresso.nome}</span>
              <span>{progresso.pct}%</span>
            </div>
            <progress className="progress progress-primary w-full" value={progresso.pct} max={100} />
          </div>
        )}

        {midias.length === 0 ? (
          <div className="text-center text-sm text-neutral py-8 border border-dashed border-base-300 rounded-2xl">
            <Film className="h-8 w-8 mx-auto mb-2 text-neutral/70" />
            Nenhum vídeo ainda.
          </div>
        ) : (
          <ul className="divide-y divide-base-300 border border-base-300 rounded-2xl overflow-hidden">
            {midias.map((m, i) => (
              <li key={m.id} className={`flex items-center gap-3 p-3 ${m.ativo ? '' : 'opacity-50'}`}>
                <span className="w-5 text-center text-xs font-mono text-neutral">{i + 1}</span>
                {m.tipo === 'youtube' && m.youtube_id ? (
                  <MiniaturaYoutube id={m.youtube_id} />
                ) : (
                  <video
                    src={`${m.url}#t=0.5`}
                    muted
                    preload="metadata"
                    className="h-14 w-24 object-cover rounded-lg bg-black shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-base-content truncate">{m.nome}</div>
                  <div className="text-xs text-neutral">
                    {m.tipo === 'youtube' ? 'YouTube · precisa de internet na TV' : `MP4 · ${formatarTamanho(m.tamanho)}`}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className={botaoDiscreto} disabled={i === 0} onClick={() => mover(i, -1)} title="Subir">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button className={botaoDiscreto} disabled={i === midias.length - 1} onClick={() => mover(i, 1)} title="Descer">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button className={botaoDiscreto} onClick={() => renomear(m)} title="Renomear" aria-label={`Renomear ${m.nome}`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button className={botaoDiscreto} onClick={() => alternar(m)} title={m.ativo ? 'Pausar na playlist' : 'Ativar'}>
                    {m.ativo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button className={`${botaoDiscreto} hover:!bg-error hover:!text-error-content`} onClick={() => excluir(m)} title="Excluir" aria-label={`Excluir ${m.nome}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {midias.length > 0 && <p className="text-xs text-neutral">{ativos} de {midias.length} ativo(s) na playlist.</p>}
      </div>

      <div className={cartao}>
        <h2 className="text-sm font-bold text-base-content">Como a TV se comporta</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {(
            [
              ['tela_cheia', 'Vídeo de fundo', 'O vídeo ocupa a tela toda, só com a faixa da chamada atual. Ao chamar alguém, o aviso grande assume a tela por alguns segundos.'],
              ['lateral', 'Vídeo + painel', 'Vídeo à esquerda e a chamada sempre visível à direita.'],
              ['video_16_9', 'TV menor + chamadas', 'Vídeo menor, sempre em 16:9, em 1/3, 1/2 ou 2/3 da tela, com a senha gigante em alto contraste.'],
            ] as const
          ).map(([valor, titulo, detalhe]) => {
            const marcado = config.tv_layout === valor;
            return (
              <button
                key={valor}
                type="button"
                aria-pressed={marcado}
                onClick={() => salvarConfig({ tv_layout: valor })}
                className={`card text-left p-3 gap-3 border-2 transition duration-200 ${
                  marcado ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-100 hover:border-primary/50'
                }`}
              >
                <PreviaLayout tipo={valor} tamanho={config.tv_video_size} />
                <div>
                  <div className="text-sm font-bold text-base-content flex items-center gap-2">
                    {marcado && <Check className="h-4 w-4 text-accent" aria-hidden="true" />}
                    {titulo}
                  </div>
                  <div className="text-xs text-neutral mt-1">{detalhe}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-3 rounded-lg border border-base-300 bg-base-200/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span id="tema-tv" className="text-xs font-semibold text-base-content block">Visual da TV (Tema)</span>
              <span className="text-xs text-neutral">Escolha entre o visual claro (fundo suave) ou escuro (alto contraste para salas de espera).</span>
            </div>
            <div role="radiogroup" aria-labelledby="tema-tv" className="join">
              {(
                [
                  ['dark', 'Escuro'],
                  ['light', 'Claro'],
                ] as const
              ).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={config.tv_theme === valor}
                  onClick={() => salvarConfig({ tv_theme: valor })}
                  className={`btn btn-sm join-item ${config.tv_theme === valor ? 'btn-primary' : 'btn-ghost border-base-300'}`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>
        </div>

        {config.tv_layout === 'video_16_9' && (
          <div className="space-y-3 rounded-lg border border-base-300 bg-base-200/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span id="tamanho-tv" className="text-xs font-semibold text-base-content">Quanto da tela o vídeo ocupa</span>
              <div role="radiogroup" aria-labelledby="tamanho-tv" className="join">
                {(
                  [
                    ['1_3', '1/3 da tela'],
                    ['1_2', '1/2 da tela'],
                    ['2_3', '2/3 da tela'],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={config.tv_video_size === valor}
                    onClick={() => salvarConfig({ tv_video_size: valor })}
                    className={`btn btn-sm join-item ${config.tv_video_size === valor ? 'btn-primary' : 'btn-ghost border-base-300'}`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>
            <Interruptor
              ativo={config.tv_show_lists}
              onChange={(v) => salvarConfig({ tv_show_lists: v })}
              titulo="Mostrar chamadas anteriores e próximos"
              detalhe="Desligado, a TV mostra só o vídeo e a chamada atual, bem grande."
            />
          </div>
        )}

        {config.tv_layout === 'tela_cheia' && (
          <label className="block text-xs text-neutral space-y-1">
            Tempo da chamada em tela cheia: <strong className="text-base-content">{config.tv_overlay_seconds} s</strong>
            <input
              type="range"
              min={4}
              max={60}
              value={config.tv_overlay_seconds}
              onChange={(e) => void salvarConfig({ tv_overlay_seconds: Number(e.target.value) })}
              className="range range-primary range-sm w-full"
            />
          </label>
        )}

        <Interruptor
          ativo={config.tv_video_muted}
          onChange={(v) => salvarConfig({ tv_video_muted: v })}
          titulo="Vídeos sem som"
          detalhe="Recomendado: o sinal sonoro da chamada fica bem audível. Com som, o vídeo abaixa o volume durante a chamada."
        />
        <Interruptor
          ativo={config.tv_sound}
          onChange={(v) => salvarConfig({ tv_sound: v })}
          titulo="Sinal sonoro na chamada (padrão)"
          detalhe="Cada TV pode sobrepor isto pelo botão de som da própria tela."
        />
        <Interruptor
          ativo={config.tv_privacy}
          onChange={(v) => salvarConfig({ tv_privacy: v })}
          titulo="Modo privacidade (LGPD) por padrão"
          detalhe="A TV mostra só a senha, sem nome do tutor e do pet."
        />
      </div>
    </div>
  );
}

// ---------- Abas: salas e serviços ----------

function useAcaoCadastro() {
  return async (fn: () => Promise<unknown>, sucesso?: string) => {
    try {
      await fn();
      await refresh();
      if (sucesso) toast.success(sucesso);
    } catch (e) {
      toast.error(erroDe(e));
    }
  };
}

function AbaSalas() {
  const { rooms } = useQueueSystem();
  const executar = useAcaoCadastro();
  const [novo, setNovo] = useState('');
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null);

  const copiarLink = async (id: string) => {
    const url = `${window.location.origin}/chamar/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link do chamador copiado. Use como atalho no computador do consultório.');
    } catch {
      toast.message(url);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!novo.trim()) return;
          void executar(() => api('POST', '/api/salas', { nome: novo }), 'Sala adicionada.').then(() => setNovo(''));
        }}
        className="card bg-base-100 border border-base-300 shadow-soft p-4 flex-row gap-3"
      >
        <input
          type="text"
          placeholder="Nome da sala (ex: Consultório 04, Sala de Curativos)..."
          value={novo}
          maxLength={60}
          onChange={(e) => setNovo(e.target.value)}
          className={`${campo} flex-1`}
        />
        <button type="submit" className={botaoPrimario}>
          <Plus className="h-4 w-4" />
          <span>Adicionar Sala</span>
        </button>
      </form>

      <div className="card bg-base-100 border border-base-300 shadow-soft overflow-hidden divide-y divide-base-300">
        {rooms.map((room) => (
          <div key={room.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-base-200 transition">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`h-3 w-3 rounded-full shrink-0 ${room.ativa ? 'bg-success' : 'bg-base-300'}`} />
              {editando?.id === room.id ? (
                <form
                  className="flex gap-2 flex-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void executar(() => api('PATCH', `/api/salas/${room.id}`, { nome: editando.nome }), 'Nome atualizado.').then(() =>
                      setEditando(null),
                    );
                  }}
                >
                  <input autoFocus className={campo} value={editando.nome} onChange={(e) => setEditando({ id: room.id, nome: e.target.value })} />
                  <button className={botaoDiscreto} type="submit">
                    <Check className="h-4 w-4" />
                  </button>
                  <button className={botaoDiscreto} type="button" onClick={() => setEditando(null)}>
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <span className="font-semibold text-base-content text-sm truncate">{room.nome}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button className={botaoDiscreto} onClick={() => copiarLink(room.id)} title="Copiar link do chamador desta sala">
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Link do chamador</span>
              </button>
              <button className={botaoDiscreto} onClick={() => setEditando({ id: room.id, nome: room.nome })} title="Renomear">
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => executar(() => api('PATCH', `/api/salas/${room.id}`, { ativa: !room.ativa }))}
                className={`btn btn-sm ${room.ativa ? 'btn-primary btn-outline' : 'btn-ghost text-neutral'}`}
              >
                {room.ativa ? 'Ativa' : 'Desativada'}
              </button>
              <button
                className={`${botaoDiscreto} hover:!bg-error hover:!text-error-content`}
                title="Excluir (só se nunca foi usada)"
                onClick={() => confirm(`Excluir a sala "${room.nome}"?`) && executar(() => api('DELETE', `/api/salas/${room.id}`), 'Sala excluída.')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AbaServicos() {
  const { services } = useQueueSystem();
  const executar = useAcaoCadastro();
  const [nome, setNome] = useState('');
  const [prefixo, setPrefixo] = useState('A');
  const [editando, setEditando] = useState<{ id: string; nome: string; prefixo: string } | null>(null);

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!nome.trim()) return;
          void executar(() => api('POST', '/api/servicos', { nome, prefixo }), 'Serviço adicionado.').then(() => {
            setNome('');
            setPrefixo('A');
          });
        }}
        className="card bg-base-100 border border-base-300 shadow-soft p-4 flex-row flex-wrap sm:flex-nowrap gap-3"
      >
        <input
          type="text"
          placeholder="Nome do serviço (ex: Retorno, Cirurgia)..."
          value={nome}
          maxLength={60}
          onChange={(e) => setNome(e.target.value)}
          className={`${campo} flex-1`}
        />
        <input
          type="text"
          maxLength={2}
          placeholder="Letra (ex: B)"
          value={prefixo}
          onChange={(e) => setPrefixo(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
          className={`${campo} w-24 text-center font-mono font-bold text-accent`}
        />
        <button type="submit" className={botaoPrimario}>
          <Plus className="h-4 w-4" />
          <span>Adicionar Serviço</span>
        </button>
      </form>

      <div className="card bg-base-100 border border-base-300 shadow-soft overflow-hidden divide-y divide-base-300">
        {services.map((s) => (
          <div key={s.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-base-200 transition">
            {editando?.id === s.id ? (
              <form
                className="flex gap-2 flex-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  void executar(() => api('PATCH', `/api/servicos/${s.id}`, { nome: editando.nome, prefixo: editando.prefixo }), 'Serviço atualizado.').then(
                    () => setEditando(null),
                  );
                }}
              >
                <input
                  className={`${campo} w-20 text-center font-mono font-bold`}
                  maxLength={2}
                  value={editando.prefixo}
                  onChange={(e) => setEditando({ ...editando, prefixo: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
                />
                <input autoFocus className={campo} value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
                <button className={botaoDiscreto} type="submit">
                  <Check className="h-4 w-4" />
                </button>
                <button className={botaoDiscreto} type="button" onClick={() => setEditando(null)}>
                  <X className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <span className="badge badge-soft-primary font-mono font-bold">
                  {s.prefixo}
                </span>
                <span className="font-semibold text-base-content text-sm">{s.nome}</span>
              </div>
            )}

            {editando?.id !== s.id && (
              <div className="flex items-center gap-2">
                <button className={botaoDiscreto} onClick={() => setEditando({ id: s.id, nome: s.nome, prefixo: s.prefixo })} title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => executar(() => api('PATCH', `/api/servicos/${s.id}`, { ativo: !s.ativo }))}
                  className={`btn btn-sm ${s.ativo ? 'btn-primary btn-outline' : 'btn-ghost text-neutral'}`}
                >
                  {s.ativo ? 'Ativo' : 'Desativado'}
                </button>
                <button
                  className={`${botaoDiscreto} hover:!bg-error hover:!text-error-content`}
                  title="Excluir (só se nunca foi usado)"
                  onClick={() => confirm(`Excluir o serviço "${s.nome}"?`) && executar(() => api('DELETE', `/api/servicos/${s.id}`), 'Serviço excluído.')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Aba: veterinários / equipe ----------

function AbaVeterinarios() {
  const { veterinarios } = useQueueSystem();
  const executar = useAcaoCadastro();
  const [nome, setNovoNome] = useState('');
  const [crmv, setNovoCrmv] = useState('');
  const [editando, setEditando] = useState<{ id: string; nome: string; crmv: string } | null>(null);

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 border border-base-300 shadow-soft p-4">
        <p className="text-xs text-neutral mb-3">
          Cadastre os profissionais da clínica. Eles ficam disponíveis para seleção rápida ao emitir senhas na recepção e no painel do chamador no consultório.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!nome.trim()) return;
            void executar(
              () => api('POST', '/api/veterinarios', { nome: nome.trim(), crmv: crmv.trim() || undefined }),
              'Veterinário(a) adicionado(a).',
            ).then(() => {
              setNovoNome('');
              setNovoCrmv('');
            });
          }}
          className="flex flex-row flex-wrap sm:flex-nowrap gap-3"
        >
          <input
            type="text"
            placeholder="Nome do(a) profissional (ex: Dra. Camila, Dr. Rafael)..."
            value={nome}
            maxLength={80}
            onChange={(e) => setNovoNome(e.target.value)}
            className={`${campo} flex-1`}
          />
          <input
            type="text"
            maxLength={30}
            placeholder="CRMV / Reg. (opcional)"
            value={crmv}
            onChange={(e) => setNovoCrmv(e.target.value)}
            className={`${campo} sm:w-44`}
          />
          <button type="submit" className={botaoPrimario}>
            <Plus className="h-4 w-4" />
            <span>Adicionar Profissional</span>
          </button>
        </form>
      </div>

      <div className="card bg-base-100 border border-base-300 shadow-soft overflow-hidden divide-y divide-base-300">
        {veterinarios.map((vet) => (
          <div key={vet.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-base-200 transition">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`h-3 w-3 rounded-full shrink-0 ${vet.ativo ? 'bg-success' : 'bg-base-300'}`} />
              {editando?.id === vet.id ? (
                <form
                  className="flex flex-wrap sm:flex-nowrap gap-2 flex-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void executar(
                      () =>
                        api('PATCH', `/api/veterinarios/${vet.id}`, {
                          nome: editando.nome.trim(),
                          crmv: editando.crmv.trim() || null,
                        }),
                      'Cadastro atualizado.',
                    ).then(() => setEditando(null));
                  }}
                >
                  <input
                    autoFocus
                    className={campo}
                    value={editando.nome}
                    onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                    placeholder="Nome"
                  />
                  <input
                    className={`${campo} sm:w-40`}
                    value={editando.crmv}
                    onChange={(e) => setEditando({ ...editando, crmv: e.target.value })}
                    placeholder="CRMV (opcional)"
                  />
                  <button className={botaoDiscreto} type="submit" title="Salvar">
                    <Check className="h-4 w-4" />
                  </button>
                  <button className={botaoDiscreto} type="button" onClick={() => setEditando(null)} title="Cancelar">
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <div className="min-w-0">
                  <span className="font-semibold text-base-content text-sm block truncate">{vet.nome}</span>
                  {vet.crmv && <span className="text-xs text-neutral block">{vet.crmv}</span>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                className={botaoDiscreto}
                onClick={() => setEditando({ id: vet.id, nome: vet.nome, crmv: vet.crmv || '' })}
                title="Editar nome / CRMV"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => executar(() => api('PATCH', `/api/veterinarios/${vet.id}`, { ativo: !vet.ativo }))}
                className={`btn btn-sm ${vet.ativo ? 'btn-primary btn-outline' : 'btn-ghost text-neutral'}`}
              >
                {vet.ativo ? 'Ativo' : 'Desativado'}
              </button>
              <button
                className={`${botaoDiscreto} hover:!bg-error hover:!text-error-content`}
                title="Excluir profissional"
                onClick={() =>
                  confirm(`Excluir o cadastro de "${vet.nome}"?`) &&
                  executar(() => api('DELETE', `/api/veterinarios/${vet.id}`), 'Profissional excluído.')
                }
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {veterinarios.length === 0 && (
          <div className="p-8 text-center text-xs text-neutral">
            Nenhum profissional cadastrado na equipe ainda.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Aba: sistema (cupom, numeração, backup, endereços) ----------

function AbaSistema({ config }: { config: AppConfig }) {
  const [rodape, setRodape] = useState(config.ticket_footer);
  const [info, setInfo] = useState<{ ips: string[]; hostname?: string; porta: number } | null>(null);
  const [qrModal, setQrModal] = useState<{ nome: string; url: string } | null>(null);

  useEffect(() => {
    api<{ ips: string[]; hostname?: string; porta: number }>('GET', '/api/info').then(setInfo).catch(() => {});
  }, []);

  const baixarBackup = async () => {
    try {
      const pin = getAdminPin();
      const res = await fetch('/api/backup', { headers: pin ? { 'x-admin-pin': pin } : {} });
      if (!res.ok) throw new ApiError(res.status, 'Não foi possível gerar o backup.');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `fila-presencial-${new Date().toISOString().slice(0, 10)}.db`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error(erroDe(e));
    }
  };

  const host = window.location.hostname;
  const usandoLocalhost = host === 'localhost' || host === '127.0.0.1';
  const ip = info?.ips[0];
  const porta = info?.porta ?? (window.location.port ? Number(window.location.port) : 3000);
  const baseIp = usandoLocalhost && ip ? `http://${ip}:${porta}` : window.location.origin;

  // Nome de rede amigável (.local via mDNS / Bonjour)
  const hostnameLimpo = (info?.hostname || '').replace(/\.local$/i, '');
  const nomeLocal = hostnameLimpo ? `${hostnameLimpo}.local` : 'fila.local';
  const baseLocal = `http://${nomeLocal}:${porta}`;

  const telas = [
    ['Recepção / triagem', '/'],
    ['Telão da TV', '/tv'],
    ['Chamador do consultório', '/chamar'],
    ['Totem de autoatendimento', '/totem'],
    ['Métricas', '/metricas'],
  ];

  return (
    <div className="space-y-6">
      <div className={cartao}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-base-content">Endereços fáceis das telas</h2>
            <p className="text-xs text-neutral">
              Acesse nos aparelhos da clínica (TVs, tablets, computadores na mesma rede Wi-Fi). Use o nome amigável ou escaneie o QR Code.
            </p>
          </div>
        </div>

        {/* Destaque do endereço amigável */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-primary uppercase tracking-wide">Nome Amigável na Rede Local (mDNS)</span>
            <div className="font-mono text-sm font-bold text-base-content">
              {baseLocal}
            </div>
            <p className="text-[11px] text-neutral">
              Funciona sem precisar decorar ou digitar números de IP no navegador de Smart TVs, tablets e celulares.
            </p>
          </div>
          <button
            className="btn btn-sm btn-outline btn-primary"
            onClick={() => navigator.clipboard?.writeText(baseLocal).then(() => toast.success('Endereço amigável copiado.'))}
          >
            <Copy className="h-4 w-4" />
            Copiar
          </button>
        </div>

        <ul className="space-y-2">
          {telas.map(([nome, rota]) => {
            const urlFinal = `${baseIp}${rota}`;
            const urlAmigavel = `${baseLocal}${rota}`;
            return (
              <li key={rota} className="flex flex-wrap items-center justify-between gap-3 bg-base-100 border border-base-300 rounded-lg px-4 py-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-base-content">{nome}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="font-mono text-xs text-accent truncate">{urlAmigavel}</code>
                    <span className="text-[10px] text-neutral/70">ou IP: {urlFinal}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    className="btn btn-primary btn-sm gap-1.5"
                    title="Exibir QR Code para escanear com celular ou tablet"
                    onClick={() => setQrModal({ nome, url: urlFinal })}
                  >
                    <QrCode className="h-4 w-4" />
                    <span>QR Code</span>
                  </button>
                  <a
                    href={rota}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-square btn-sm"
                    title={`Abrir ${nome} em nova aba`}
                    aria-label={`Abrir ${nome} em nova aba`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    className="btn btn-ghost btn-square btn-sm"
                    title="Copiar endereço"
                    aria-label="Copiar endereço"
                    onClick={() => navigator.clipboard?.writeText(urlFinal).then(() => toast.success('Endereço copiado.'))}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Modal interativo com o QR Code */}
      {qrModal && (
        <div className="modal modal-open">
          <div className="modal-box text-center max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-lg text-base-content">{qrModal.nome}</h3>
            <p className="text-xs text-neutral">
              Aponte a câmera do celular, tablet ou leitor da TV para abrir direto:
            </p>
            <div
              className="mx-auto flex items-center justify-center p-3 bg-white rounded-xl shadow-inner border border-base-300"
              dangerouslySetInnerHTML={{ __html: qrCodeParaSvg(qrModal.url, 220) }}
            />
            <div className="bg-base-200 rounded-lg p-2.5">
              <code className="font-mono text-xs text-accent break-all">{qrModal.url}</code>
            </div>
            <div className="modal-action justify-center">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigator.clipboard?.writeText(qrModal.url).then(() => toast.success('Link copiado.'))}
              >
                <Copy className="h-4 w-4" /> Copiar link
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setQrModal(null)}>
                Fechar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setQrModal(null)} />
        </div>
      )}

      <div className={cartao}>
        <h2 className="text-sm font-bold text-base-content">Cupom da senha (impressora térmica)</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-neutral">
            Largura do papel
            <select
              className="select select-bordered w-full"
              value={config.ticket_width_mm}
              onChange={(e) => void salvarConfig({ ticket_width_mm: e.target.value as '58' | '80' })}
            >
              <option value="58">58 mm</option>
              <option value="80">80 mm</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-neutral">
            Mensagem no rodapé
            <input
              className={campo}
              maxLength={120}
              value={rodape}
              onChange={(e) => setRodape(e.target.value)}
              onBlur={() => rodape !== config.ticket_footer && void salvarConfig({ ticket_footer: rodape }, 'Rodapé salvo.')}
            />
          </label>
        </div>
        <Interruptor
          ativo={config.ticket_show_logo}
          onChange={(v) => salvarConfig({ ticket_show_logo: v })}
          titulo="Imprimir o logotipo no cupom"
          detalhe="Convertido para preto e branco automaticamente."
        />
      </div>

      <div className={cartao}>
        <h2 className="text-sm font-bold text-base-content">Numeração das senhas</h2>
        <Interruptor
          ativo={config.reset_daily}
          onChange={(v) => salvarConfig({ reset_daily: v })}
          titulo="Reiniciar a numeração todo dia"
          detalhe="Cada dia começa em A001, B001... Desligado, a contagem segue sem parar."
        />
      </div>

      <div className={cartao}>
        <h2 className="text-sm font-bold text-base-content">Backup</h2>
        <p className="text-xs text-neutral">
          Todos os dados ficam no arquivo <code className="text-base-content">data/fila.db</code> (e os vídeos em{' '}
          <code className="text-base-content">data/uploads</code>) na pasta do sistema. Baixe uma cópia segura do banco quando quiser.
        </p>
        <button className={botaoPrimario} onClick={baixarBackup}>
          <Download className="h-4 w-4" />
          Baixar backup do banco
        </button>
      </div>
    </div>
  );
}

// ---------- Página ----------

const ABAS: Array<{ id: Aba; rotulo: string; icone: typeof Palette }> = [
  { id: 'marca', rotulo: 'Aparência', icone: Palette },
  { id: 'tv', rotulo: 'TV & Vídeos', icone: Tv },
  { id: 'rooms', rotulo: 'Consultórios & Salas', icone: DoorOpen },
  { id: 'vets', rotulo: 'Equipe de Veterinários', icone: Stethoscope },
  { id: 'services', rotulo: 'Serviços & Prefixos', icone: Tag },
  { id: 'sistema', rotulo: 'Sistema', icone: Server },
];

export default function SettingsPage() {
  const { config, midias, loading } = useQueueSystem();
  const [aba, setAba] = useState<Aba>('marca');
  const [liberado, setLiberado] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ pinRequired: boolean }>('GET', '/api/auth')
      .then(async ({ pinRequired }) => {
        if (!pinRequired) return setLiberado(true);
        // PIN guardado nesta sessão do navegador: confere se ainda vale
        if (getAdminPin()) {
          try {
            await api('POST', '/api/auth/verificar', { pin: getAdminPin() });
            return setLiberado(true);
          } catch {
            setAdminPin('');
          }
        }
        setLiberado(false);
      })
      .catch(() => setLiberado(true));
  }, []);

  if (liberado === null || loading) return <div className="min-h-screen bg-base-100" />;
  if (!liberado) return <PortaPin onLiberado={() => setLiberado(true)} />;

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col pb-28">
      <header className="navbar bg-base-200 border-b border-base-300 px-6 py-4 flex-wrap justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/" className="btn btn-ghost btn-square" title="Voltar à recepção" aria-label="Voltar à recepção">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div>
            <h1 className="text-lg font-bold text-base-content">Ajustes</h1>
            <p className="text-xs text-neutral">Cores, logotipo, vídeos da TV, salas, equipe e serviços</p>
          </div>
        </div>

        <nav role="tablist" className="tabs tabs-boxed !flex max-w-full flex-wrap">
          {ABAS.map(({ id, rotulo, icone: Icone }) => (
            <button
              key={id}
              role="tab"
              onClick={() => setAba(id)}
              className={`tab h-auto gap-2 whitespace-nowrap py-1.5 ${aba === id ? 'tab-active' : ''}`}
            >
              <Icone className="h-4 w-4" />
              <span>{rotulo}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-4xl w-full mx-auto p-6">
        {aba === 'marca' && <AbaMarca config={config} />}
        {aba === 'tv' && <AbaTv config={config} midias={midias} />}
        {aba === 'rooms' && <AbaSalas />}
        {aba === 'vets' && <AbaVeterinarios />}
        {aba === 'services' && <AbaServicos />}
        {aba === 'sistema' && <AbaSistema config={config} />}
      </main>
    </div>
  );
}
