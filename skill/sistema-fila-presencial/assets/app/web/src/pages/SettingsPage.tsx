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
  Eye,
  EyeOff,
  Film,
  ImagePlus,
  Lock,
  Palette,
  Pencil,
  Plus,
  Server,
  Tag,
  Trash2,
  Tv,
  Upload,
  X,
} from 'lucide-react';
import { useQueueSystem } from '@/hooks/useQueueSystem';
import { api, ApiError, enviarArquivo, getAdminPin, setAdminPin } from '@/lib/api';
import { aplicarTemaTemporario, refresh } from '@/lib/store';
import BrandMark from '@/components/BrandMark';
import type { AppConfig, Media } from '@/types/queue';

type Aba = 'marca' | 'tv' | 'rooms' | 'services' | 'sistema';

const CORES_PRONTAS = [
  { nome: 'Esmeralda', hex: '#10b981' },
  { nome: 'Azul', hex: '#2563eb' },
  { nome: 'Turquesa', hex: '#0d9488' },
  { nome: 'Roxo', hex: '#7c3aed' },
  { nome: 'Rosa', hex: '#db2777' },
  { nome: 'Laranja', hex: '#ea580c' },
  { nome: 'Vermelho', hex: '#dc2626' },
  { nome: 'Dourado', hex: '#ca8a04' },
];

const campo =
  'w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500';
const cartao = 'bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4';
const botaoPrimario =
  'bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-xl inline-flex items-center gap-2 transition';
const botaoDiscreto =
  'bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl inline-flex items-center gap-2 transition';

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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <form onSubmit={entrar} className={`${cartao} w-full max-w-sm text-center`}>
        <Lock className="h-8 w-8 mx-auto text-brand-400" />
        <h1 className="text-lg font-bold text-white">Ajustes protegidos</h1>
        <p className="text-xs text-slate-400">Digite o PIN de administrador definido para este sistema.</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className={`${campo} text-center tracking-widest`}
          placeholder="PIN"
        />
        <button type="submit" disabled={!pin || carregando} className={`${botaoPrimario} w-full justify-center`}>
          Entrar
        </button>
        <a href="/" className="block text-xs text-slate-500 hover:text-slate-300">
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
        <h2 className="text-sm font-bold text-white">Identidade da clínica</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-slate-400">
            Nome da clínica
            <input className={campo} maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            Subtítulo (aparece na TV)
            <input className={campo} maxLength={80} value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <div className="h-24 min-w-24 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center px-4">
            <BrandMark size="lg" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-slate-400">Logotipo: PNG, JPG, WebP ou SVG, até 5 MB. Fundo transparente fica melhor na TV.</p>
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
      </div>

      <div className={cartao}>
        <h2 className="text-sm font-bold text-white">Cor da marca</h2>
        <p className="text-xs text-slate-400">
          Escolha uma cor: botões, destaques, senha da TV e totem se ajustam sozinhos (tons claros e escuros são gerados).
        </p>
        <div className="flex flex-wrap gap-2">
          {CORES_PRONTAS.map((c) => (
            <button
              key={c.hex}
              title={c.nome}
              onClick={() => setCor(c.hex)}
              className={`h-9 w-9 rounded-full border-2 transition ${cor.toLowerCase() === c.hex ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ background: c.hex }}
            >
              {cor.toLowerCase() === c.hex && <Check className="h-4 w-4 mx-auto text-white" />}
            </button>
          ))}
          <label className="flex items-center gap-2 text-xs text-slate-400 ml-2">
            Personalizada
            <input
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              className="h-9 w-12 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
            />
            <code className="font-mono text-slate-300">{cor}</code>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex flex-wrap items-center gap-4">
          <span className="font-mono text-4xl font-black text-brand-400">A014</span>
          <span className="text-xs px-3 py-1 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30 font-semibold">
            Chamada atual
          </span>
          <button className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl">Chamar Próximo</button>
          <span className="text-xs text-slate-500">Pré-visualização</span>
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
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      onClick={() => onChange(!ativo)}
      className="w-full flex items-center justify-between gap-4 text-left rounded-xl px-1 py-2 hover:bg-slate-900/50 transition"
    >
      <span>
        <span className="block text-sm font-semibold text-white">{titulo}</span>
        <span className="block text-xs text-slate-400">{detalhe}</span>
      </span>
      <span className={`h-6 w-11 rounded-full p-0.5 transition shrink-0 ${ativo ? 'bg-brand-600' : 'bg-slate-700'}`}>
        <span className={`block h-5 w-5 rounded-full bg-white transition ${ativo ? 'translate-x-5' : ''}`} />
      </span>
    </button>
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

function AbaTv({ config, midias }: { config: AppConfig; midias: Media[] }) {
  const [progresso, setProgresso] = useState<{ nome: string; pct: number } | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

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
    if (!confirm(`Excluir o vídeo "${m.nome}" definitivamente?`)) return;
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
          <h2 className="text-sm font-bold text-white">Vídeos da sala de espera</h2>
          <a href="/tv" target="_blank" rel="noreferrer" className={botaoDiscreto}>
            <Tv className="h-4 w-4" />
            Abrir a TV
          </a>
        </div>
        <p className="text-xs text-slate-400">
          Os vídeos tocam em sequência e em loop na TV, sem parar. Formato mais compatível com Smart TVs:{' '}
          <strong className="text-slate-200">MP4 (H.264 + AAC), 1080p</strong>. Sem vídeos ativos, a TV mostra só o painel de chamadas.
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

        {progresso && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="truncate">Enviando {progresso.nome}</span>
              <span>{progresso.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-brand-500 transition-all" style={{ width: `${progresso.pct}%` }} />
            </div>
          </div>
        )}

        {midias.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-8 border border-dashed border-slate-800 rounded-2xl">
            <Film className="h-8 w-8 mx-auto mb-2 text-slate-600" />
            Nenhum vídeo ainda.
          </div>
        ) : (
          <ul className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden">
            {midias.map((m, i) => (
              <li key={m.id} className={`flex items-center gap-3 p-3 ${m.ativo ? '' : 'opacity-50'}`}>
                <span className="w-5 text-center text-xs font-mono text-slate-500">{i + 1}</span>
                <video
                  src={`${m.url}#t=0.5`}
                  muted
                  preload="metadata"
                  className="h-14 w-24 object-cover rounded-lg bg-black shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">{m.nome}</div>
                  <div className="text-xs text-slate-500">{formatarTamanho(m.tamanho)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button className={botaoDiscreto} disabled={i === 0} onClick={() => mover(i, -1)} title="Subir">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button className={botaoDiscreto} disabled={i === midias.length - 1} onClick={() => mover(i, 1)} title="Descer">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button className={botaoDiscreto} onClick={() => alternar(m)} title={m.ativo ? 'Pausar na playlist' : 'Ativar'}>
                    {m.ativo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button className={`${botaoDiscreto} hover:!bg-rose-600`} onClick={() => excluir(m)} title="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {midias.length > 0 && <p className="text-xs text-slate-500">{ativos} de {midias.length} ativo(s) na playlist.</p>}
      </div>

      <div className={cartao}>
        <h2 className="text-sm font-bold text-white">Como a TV se comporta</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {(
            [
              ['lateral', 'Vídeo + painel', 'Vídeo à esquerda e a chamada sempre visível à direita.'],
              ['tela_cheia', 'Vídeo em tela cheia', 'O vídeo ocupa a tela; a chamada assume tudo por alguns segundos e depois o vídeo volta.'],
            ] as const
          ).map(([valor, titulo, detalhe]) => (
            <button
              key={valor}
              onClick={() => salvarConfig({ tv_layout: valor })}
              className={`text-left p-4 rounded-2xl border transition ${
                config.tv_layout === valor ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="text-sm font-bold text-white flex items-center gap-2">
                {config.tv_layout === valor && <Check className="h-4 w-4 text-brand-400" />}
                {titulo}
              </div>
              <div className="text-xs text-slate-400 mt-1">{detalhe}</div>
            </button>
          ))}
        </div>

        {config.tv_layout === 'tela_cheia' && (
          <label className="block text-xs text-slate-400 space-y-1">
            Tempo da chamada em tela cheia: <strong className="text-slate-200">{config.tv_overlay_seconds} s</strong>
            <input
              type="range"
              min={4}
              max={60}
              value={config.tv_overlay_seconds}
              onChange={(e) => void salvarConfig({ tv_overlay_seconds: Number(e.target.value) })}
              className="w-full accent-brand-500"
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
        className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl flex gap-3"
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

      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
        {rooms.map((room) => (
          <div key={room.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-900/40 transition">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`h-3 w-3 rounded-full shrink-0 ${room.ativa ? 'bg-brand-400' : 'bg-slate-600'}`} />
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
                <span className="font-semibold text-white text-sm truncate">{room.nome}</span>
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
                className={`text-xs px-3 py-2 rounded-xl font-semibold border transition ${
                  room.ativa
                    ? 'border-brand-500/30 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                {room.ativa ? 'Ativa' : 'Desativada'}
              </button>
              <button
                className={`${botaoDiscreto} hover:!bg-rose-600`}
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
        className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl flex flex-wrap sm:flex-nowrap gap-3"
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
          className={`${campo} w-24 text-center font-mono font-bold text-brand-400`}
        />
        <button type="submit" className={botaoPrimario}>
          <Plus className="h-4 w-4" />
          <span>Adicionar Serviço</span>
        </button>
      </form>

      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
        {services.map((s) => (
          <div key={s.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-900/40 transition">
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
                <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  {s.prefixo}
                </span>
                <span className="font-semibold text-white text-sm">{s.nome}</span>
              </div>
            )}

            {editando?.id !== s.id && (
              <div className="flex items-center gap-2">
                <button className={botaoDiscreto} onClick={() => setEditando({ id: s.id, nome: s.nome, prefixo: s.prefixo })} title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => executar(() => api('PATCH', `/api/servicos/${s.id}`, { ativo: !s.ativo }))}
                  className={`text-xs px-3 py-2 rounded-xl font-semibold border transition ${
                    s.ativo
                      ? 'border-brand-500/30 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20'
                      : 'border-slate-700 bg-slate-800 text-slate-400'
                  }`}
                >
                  {s.ativo ? 'Ativo' : 'Desativado'}
                </button>
                <button
                  className={`${botaoDiscreto} hover:!bg-rose-600`}
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

// ---------- Aba: sistema (cupom, numeração, backup, endereços) ----------

function AbaSistema({ config }: { config: AppConfig }) {
  const [rodape, setRodape] = useState(config.ticket_footer);
  const [info, setInfo] = useState<{ ips: string[]; porta: number } | null>(null);

  useEffect(() => {
    api<{ ips: string[]; porta: number }>('GET', '/api/info').then(setInfo).catch(() => {});
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
  const base = usandoLocalhost && ip ? `http://${ip}:${info?.porta ?? window.location.port}` : window.location.origin;

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
        <h2 className="text-sm font-bold text-white">Endereços das telas</h2>
        <p className="text-xs text-slate-400">
          Digite estes endereços no navegador da TV, do tablet do totem e dos computadores. Eles precisam estar na mesma rede
          (Wi-Fi ou cabo) deste computador.
          {usandoLocalhost && !ip && ' Descubra o IP deste computador (veja a documentação de instalação) e troque "localhost" por ele.'}
        </p>
        <ul className="space-y-2">
          {telas.map(([nome, rota]) => (
            <li key={rota} className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
              <span className="text-xs text-slate-400">{nome}</span>
              <span className="flex items-center gap-2 min-w-0">
                <code className="font-mono text-xs text-brand-300 truncate">{base}{rota}</code>
                <button
                  className="text-slate-400 hover:text-white"
                  title="Copiar"
                  onClick={() => navigator.clipboard?.writeText(`${base}${rota}`).then(() => toast.success('Endereço copiado.'))}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className={cartao}>
        <h2 className="text-sm font-bold text-white">Cupom da senha (impressora térmica)</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-slate-400">
            Largura do papel
            <select
              className={campo}
              value={config.ticket_width_mm}
              onChange={(e) => void salvarConfig({ ticket_width_mm: e.target.value as '58' | '80' })}
            >
              <option value="58">58 mm</option>
              <option value="80">80 mm</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-400">
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
        <h2 className="text-sm font-bold text-white">Numeração das senhas</h2>
        <Interruptor
          ativo={config.reset_daily}
          onChange={(v) => salvarConfig({ reset_daily: v })}
          titulo="Reiniciar a numeração todo dia"
          detalhe="Cada dia começa em A001, B001... Desligado, a contagem segue sem parar."
        />
      </div>

      <div className={cartao}>
        <h2 className="text-sm font-bold text-white">Backup</h2>
        <p className="text-xs text-slate-400">
          Todos os dados ficam no arquivo <code className="text-slate-200">data/fila.db</code> (e os vídeos em{' '}
          <code className="text-slate-200">data/uploads</code>) na pasta do sistema. Baixe uma cópia segura do banco quando quiser.
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

  if (liberado === null || loading) return <div className="min-h-screen bg-slate-900" />;
  if (!liberado) return <PortaPin onLiberado={() => setLiberado(true)} />;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col pb-20">
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/" className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition" title="Voltar à recepção">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div>
            <h1 className="text-lg font-bold text-white">Ajustes</h1>
            <p className="text-xs text-slate-400">Cores, logotipo, vídeos da TV, salas e serviços</p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2">
          {ABAS.map(({ id, rotulo, icone: Icone }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`text-xs px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
                aba === id ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
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
        {aba === 'services' && <AbaServicos />}
        {aba === 'sistema' && <AbaSistema config={config} />}
      </main>
    </div>
  );
}
