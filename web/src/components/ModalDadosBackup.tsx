import { useEffect, useState, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  X,
  Plus,
  Lock,
  Layers,
  Activity,
} from 'lucide-react';
import { api, ApiError, getAdminPin, setAdminPin, enviarBackupBanco, baixarArquivoComPin } from '@/lib/api';
import { refresh } from '@/lib/store';
import type { BackupInfo, PersistenceStats } from '@/types/queue';
import { toast } from 'sonner';

interface ModalDadosBackupProps {
  aberto: boolean;
  onFechar: () => void;
}

type Aba = 'exportar' | 'importar' | 'backups';

function formatarBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatarData(isoStr?: string | null): string {
  if (!isoStr) return 'Não registrado';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

export default function ModalDadosBackup({ aberto, onFechar }: ModalDadosBackupProps) {
  const [aba, setAba] = useState<Aba>('exportar');
  const [stats, setStats] = useState<PersistenceStats | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [executandoAcao, setExecutandoAcao] = useState(false);
  const [progressoUpload, setProgressoUpload] = useState<number | null>(null);

  // Estado para PIN se necessário
  const [precisaPin, setPrecisaPin] = useState(false);
  const [pinDigitado, setPinDigitado] = useState('');

  // Estado de arquivo para importação
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [modoImportacaoJson, setModoImportacaoJson] = useState<'tudo' | 'config_cadastros'>('tudo');
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  // Confirmação para restaurar
  const [confirmandoRestauracao, setConfirmandoRestauracao] = useState<string | null>(null);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const auth = await api<{ pinRequired: boolean }>('GET', '/api/auth').catch(() => ({ pinRequired: false }));
      if (auth.pinRequired && !getAdminPin()) {
        setPrecisaPin(true);
      } else {
        setPrecisaPin(false);
      }

      const s = await api<PersistenceStats>('GET', '/api/dados/estatisticas');
      setStats(s);

      const b = await api<BackupInfo[]>('GET', '/api/backups').catch(() => []);
      setBackups(b);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setPrecisaPin(true);
      }
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (aberto) {
      void carregarDados();
    } else {
      setArquivoSelecionado(null);
      setConfirmandoRestauracao(null);
      setProgressoUpload(null);
    }
  }, [aberto]);

  if (!aberto) return null;

  const validarPin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAdminPin(pinDigitado);
      await api('POST', '/api/auth/verificar', { pin: pinDigitado });
      setPrecisaPin(false);
      toast.success('Acesso liberado aos dados.');
      void carregarDados();
    } catch (err) {
      setAdminPin('');
      toast.error(err instanceof Error ? err.message : 'PIN incorreto.');
    }
  };

  // Ações de Exportação
  const baixarBancoSqlite = async () => {
    try {
      setExecutandoAcao(true);
      const dia = new Date().toISOString().slice(0, 10);
      await baixarArquivoComPin('/api/backup', `fila-presencial-${dia}.db`);
      toast.success('Backup do banco SQLite baixado com sucesso.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível baixar o banco.');
    } finally {
      setExecutandoAcao(false);
    }
  };

  const baixarDadosJson = async () => {
    try {
      setExecutandoAcao(true);
      const dia = new Date().toISOString().slice(0, 10);
      await baixarArquivoComPin('/api/dados/exportar?download=1', `fila-dados-${dia}.json`);
      toast.success('Dados completos em JSON baixados com sucesso.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível exportar os dados em JSON.');
    } finally {
      setExecutandoAcao(false);
    }
  };

  // Ações de Backup Manual
  const criarBackupManual = async () => {
    try {
      setExecutandoAcao(true);
      const b = await api<BackupInfo>('POST', '/api/backups');
      toast.success(`Backup criado com sucesso: ${b.arquivo}`);
      await carregarDados();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar backup manual.');
    } finally {
      setExecutandoAcao(false);
    }
  };

  const restaurarBackupLocal = async (arquivo: string) => {
    try {
      setExecutandoAcao(true);
      await api('POST', '/api/backups/restaurar', { arquivo });
      toast.success(`Banco de dados restaurado com sucesso para ${arquivo}!`);
      setConfirmandoRestauracao(null);
      await refresh();
      await carregarDados();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao restaurar backup.');
    } finally {
      setExecutandoAcao(false);
    }
  };

  const excluirBackup = async (arquivo: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o arquivo de backup "${arquivo}"?`)) return;
    try {
      setExecutandoAcao(true);
      await api('DELETE', `/api/backups/${encodeURIComponent(arquivo)}`);
      toast.success(`Backup ${arquivo} removido.`);
      await carregarDados();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir backup.');
    } finally {
      setExecutandoAcao(false);
    }
  };

  const baixarBackupEspecifico = async (arquivo: string) => {
    try {
      await baixarArquivoComPin(`/api/backups/${encodeURIComponent(arquivo)}`, arquivo);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao baixar o arquivo.');
    }
  };

  // Ação de Importação
  const executarImportacao = async () => {
    if (!arquivoSelecionado) return;
    const nome = arquivoSelecionado.name.toLowerCase();

    try {
      setExecutandoAcao(true);

      if (nome.endsWith('.db')) {
        // Envio de arquivo binário SQLite
        setProgressoUpload(0);
        await enviarBackupBanco(arquivoSelecionado, (pct) => setProgressoUpload(pct));
        toast.success('Banco de dados SQLite restaurado com sucesso! As telas já foram atualizadas.');
      } else if (nome.endsWith('.json')) {
        // Importação de arquivo JSON
        const texto = await arquivoSelecionado.text();
        let jsonDados: unknown;
        try {
          jsonDados = JSON.parse(texto);
        } catch {
          throw new Error('O arquivo selecionado não contém um formato JSON válido.');
        }

        const res = await api<{ ok: boolean; mensagem: string }>('POST', '/api/dados/importar', {
          dados: jsonDados,
          modo: modoImportacaoJson,
        });
        toast.success(res.mensagem || 'Dados importados com sucesso! As telas já foram atualizadas.');
      } else {
        throw new Error('Formato não suportado. Selecione um arquivo com extensão .db ou .json.');
      }

      setArquivoSelecionado(null);
      if (inputArquivoRef.current) inputArquivoRef.current.value = '';
      await refresh();
      await carregarDados();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na importação.');
    } finally {
      setExecutandoAcao(false);
      setProgressoUpload(null);
    }
  };

  const badgeTipo = (tipo: string) => {
    switch (tipo) {
      case 'auto':
        return <span className="badge badge-info badge-sm whitespace-nowrap">Automático Diário</span>;
      case 'manual':
        return <span className="badge badge-primary badge-sm whitespace-nowrap">Manual</span>;
      case 'pre-restauracao':
      case 'pre-importacao':
        return <span className="badge badge-warning badge-sm whitespace-nowrap">Pré-Restauração</span>;
      default:
        return <span className="badge badge-ghost badge-sm whitespace-nowrap">{tipo}</span>;
    }
  };

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-base-100 border border-base-300 shadow-2xl rounded-2xl">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-base-300 px-6 py-4 bg-base-200/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-base-content">Persistência & Backup de Dados</h2>
                <span className="badge badge-success badge-sm gap-1 text-[11px] font-semibold py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success-content animate-pulse" />
                  100% Local (SQLite)
                </span>
              </div>
              <p className="text-xs text-neutral">
                Independente de bancos externos, internet ou nuvem. Importe, exporte e restaure com tranquilidade.
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="btn btn-ghost btn-sm btn-circle text-neutral hover:text-base-content"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Bloqueio por PIN se exigido */}
        {precisaPin ? (
          <div className="p-8 text-center max-w-sm mx-auto my-auto space-y-4">
            <div className="p-3 rounded-full bg-accent/10 text-accent w-fit mx-auto">
              <Lock className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-bold text-base-content text-base">Acesso protegido por PIN</h3>
              <p className="text-xs text-neutral mt-1">
                Digite o PIN de administrador da clínica para gerenciar importações e backups.
              </p>
            </div>
            <form onSubmit={validarPin} className="space-y-3">
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                placeholder="PIN"
                value={pinDigitado}
                onChange={(e) => setPinDigitado(e.target.value)}
                className="input input-bordered w-full text-center text-lg tracking-widest font-mono"
              />
              <button type="submit" disabled={!pinDigitado} className="btn btn-primary w-full">
                Liberar Acesso
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Cartões Rápidos de Status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-base-200/50 border border-base-300 rounded-xl p-3.5 space-y-1">
                <div className="text-[11px] font-medium text-neutral flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-primary" />
                  Banco SQLite Local
                </div>
                <div className="text-base font-bold text-base-content truncate">
                  {formatarBytes(stats?.tamanhoBancoBytes || 0)}
                </div>
                <div className="text-[10px] text-neutral/70 font-mono truncate">data/fila.db</div>
              </div>

              <div className="bg-base-200/50 border border-base-300 rounded-xl p-3.5 space-y-1">
                <div className="text-[11px] font-medium text-neutral flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-success" />
                  Senhas Registradas
                </div>
                <div className="text-base font-bold text-base-content">
                  {stats?.totalItens ?? '—'} <span className="text-xs font-normal text-neutral">totais</span>
                </div>
                <div className="text-[10px] text-neutral">
                  {stats?.totalAtivos ?? 0} no saguão agora
                </div>
              </div>

              <div className="bg-base-200/50 border border-base-300 rounded-xl p-3.5 space-y-1">
                <div className="text-[11px] font-medium text-neutral flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-info" />
                  Cadastros Ativos
                </div>
                <div className="text-base font-bold text-base-content">
                  {(stats?.totalServicos ?? 0) + (stats?.totalSalas ?? 0)}
                </div>
                <div className="text-[10px] text-neutral">
                  {stats?.totalServicos ?? 0} serviços · {stats?.totalSalas ?? 0} salas
                </div>
              </div>

              <div className="bg-base-200/50 border border-base-300 rounded-xl p-3.5 space-y-1">
                <div className="text-[11px] font-medium text-neutral flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-accent" />
                  Backups Locais
                </div>
                <div className="text-base font-bold text-base-content">
                  {stats?.totalBackups ?? backups.length}
                </div>
                <div className="text-[10px] text-neutral truncate">
                  {stats?.ultimoBackup ? `Último: ${formatarData(stats.ultimoBackup).split(' ')[0]}` : 'Diário automático'}
                </div>
              </div>
            </div>

            {/* Abas */}
            <div className="tabs tabs-boxed bg-base-200/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAba('exportar')}
                className={`tab flex-1 gap-2 font-medium rounded-lg transition-all ${
                  aba === 'exportar' ? 'tab-active bg-primary text-primary-content shadow-sm' : 'text-neutral'
                }`}
              >
                <Download className="h-4 w-4" />
                <span>Exportar Dados</span>
              </button>
              <button
                type="button"
                onClick={() => setAba('importar')}
                className={`tab flex-1 gap-2 font-medium rounded-lg transition-all ${
                  aba === 'importar' ? 'tab-active bg-primary text-primary-content shadow-sm' : 'text-neutral'
                }`}
              >
                <Upload className="h-4 w-4" />
                <span>Importar / Restaurar</span>
              </button>
              <button
                type="button"
                onClick={() => setAba('backups')}
                className={`tab flex-1 gap-2 font-medium rounded-lg transition-all ${
                  aba === 'backups' ? 'tab-active bg-primary text-primary-content shadow-sm' : 'text-neutral'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>Histórico de Backups ({backups.length})</span>
              </button>
            </div>

            {/* Conteúdo da Aba Exportar */}
            {aba === 'exportar' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Card 1: Baixar SQLite .db */}
                  <div className="card bg-base-100 border border-base-300 p-5 space-y-3.5 shadow-soft hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        <HardDrive className="h-5 w-5" />
                      </div>
                      <span className="badge badge-outline badge-primary text-[10px] font-semibold">
                        Recomendado
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-base-content text-sm">Backup Completo do Banco (.db)</h4>
                      <p className="text-xs text-neutral mt-1 leading-relaxed">
                        Cópia binária direta e consistente do SQLite (<code className="text-[11px]">fila.db</code>).
                        Perfeito para guardar em um pendrive ou migrar o sistema para outro computador com 1 clique.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={executandoAcao}
                      onClick={baixarBancoSqlite}
                      className="btn btn-primary w-full gap-2 mt-auto"
                    >
                      <Download className="h-4 w-4" />
                      <span>Baixar Banco SQLite (.db)</span>
                    </button>
                  </div>

                  {/* Card 2: Exportar JSON */}
                  <div className="card bg-base-100 border border-base-300 p-5 space-y-3.5 shadow-soft hover:border-accent/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2.5 rounded-lg bg-accent/10 text-accent">
                        <FileText className="h-5 w-5" />
                      </div>
                      <span className="badge badge-outline badge-accent text-[10px] font-semibold">
                        Legível & Portável
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-base-content text-sm">Exportar Dados em JSON (.json)</h4>
                      <p className="text-xs text-neutral mt-1 leading-relaxed">
                        Exporta configurações visuais, salas, serviços, equipe veterinária e histórico da fila
                        em arquivo de texto aberto. Excelente para auditoria ou importar cadastros em outra filial.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={executandoAcao}
                      onClick={baixarDadosJson}
                      className="btn btn-outline btn-accent w-full gap-2 mt-auto"
                    >
                      <Download className="h-4 w-4" />
                      <span>Baixar Dados em JSON (.json)</span>
                    </button>
                  </div>
                </div>

                <div className="alert bg-base-200/50 border border-base-300 text-xs text-neutral rounded-xl flex items-start gap-3 p-3.5">
                  <ShieldCheck className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-base-content">Privacidade e Autonomia Total: </span>
                    Seus dados nunca saem da sua rede local e nunca dependem de conexões com provedores externos.
                    Você tem posse total e irrestrita dos seus cadastros e atendimentos.
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo da Aba Importar */}
            {aba === 'importar' && (
              <div className="space-y-4">
                <div className="alert bg-primary/5 border border-primary/20 rounded-xl p-3.5 text-xs text-neutral flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-base-content font-semibold">Proteção Pré-Restauração Ativa: </strong>
                    Sempre que você importar um arquivo, o sistema cria automaticamente um ponto de restauração
                    do estado atual. Seus dados nunca são sobrescritos sem uma cópia de resgate.
                  </div>
                </div>

                {/* Dropzone / Seletor de Arquivo */}
                <div
                  onClick={() => inputArquivoRef.current?.click()}
                  className="border-2 border-dashed border-base-300 hover:border-primary/60 bg-base-200/30 hover:bg-base-200/60 transition-all rounded-2xl p-6 text-center cursor-pointer space-y-3"
                >
                  <input
                    ref={inputArquivoRef}
                    type="file"
                    accept=".db,.json,application/json,application/octet-stream"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setArquivoSelecionado(f);
                    }}
                  />
                  <div className="p-3 bg-base-100 border border-base-300 rounded-full w-fit mx-auto shadow-sm text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-base-content">
                      {arquivoSelecionado ? arquivoSelecionado.name : 'Clique para selecionar ou arraste o arquivo aqui'}
                    </div>
                    <p className="text-xs text-neutral mt-0.5">
                      Suporta arquivos de backup do SQLite (<code className="text-primary font-mono font-bold">.db</code>)
                      ou arquivos de exportação (<code className="text-accent font-mono font-bold">.json</code>)
                    </p>
                  </div>
                  {arquivoSelecionado && (
                    <div className="badge badge-neutral badge-sm">
                      {formatarBytes(arquivoSelecionado.size)}
                    </div>
                  )}
                </div>

                {/* Opções conforme o tipo de arquivo selecionado */}
                {arquivoSelecionado && (
                  <div className="card bg-base-200/40 border border-base-300 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-base-content uppercase tracking-wider">
                        Configuração de Restauração
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setArquivoSelecionado(null);
                          if (inputArquivoRef.current) inputArquivoRef.current.value = '';
                        }}
                        className="btn btn-ghost btn-xs text-error"
                      >
                        Remover seleção
                      </button>
                    </div>

                    {arquivoSelecionado.name.toLowerCase().endsWith('.db') ? (
                      <div className="text-xs text-neutral space-y-1">
                        <p className="font-semibold text-base-content">
                          Substituição Segura do Banco SQLite:
                        </p>
                        <p>
                          O arquivo <strong className="text-base-content">{arquivoSelecionado.name}</strong> será
                          validado contra integridade de dados e carregado como novo banco ativo. Todas as telas
                          conectadas (TV, Totem, Consultório) atualizarão instantaneamente.
                        </p>
                      </div>
                    ) : arquivoSelecionado.name.toLowerCase().endsWith('.json') ? (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-neutral">Modo de Importação JSON:</span>
                        <div className="grid sm:grid-cols-2 gap-2 text-xs">
                          <label
                            className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                              modoImportacaoJson === 'tudo'
                                ? 'bg-primary/10 border-primary text-base-content font-medium'
                                : 'bg-base-100 border-base-300 text-neutral'
                            }`}
                          >
                            <input
                              type="radio"
                              name="modo-import"
                              checked={modoImportacaoJson === 'tudo'}
                              onChange={() => setModoImportacaoJson('tudo')}
                              className="radio radio-primary radio-xs mt-0.5"
                            />
                            <div>
                              <strong className="block text-base-content">Restauração Completa</strong>
                              <span>Importa configurações, salas, serviços, equipe e histórico de atendimentos.</span>
                            </div>
                          </label>

                          <label
                            className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                              modoImportacaoJson === 'config_cadastros'
                                ? 'bg-primary/10 border-primary text-base-content font-medium'
                                : 'bg-base-100 border-base-300 text-neutral'
                            }`}
                          >
                            <input
                              type="radio"
                              name="modo-import"
                              checked={modoImportacaoJson === 'config_cadastros'}
                              onChange={() => setModoImportacaoJson('config_cadastros')}
                              className="radio radio-primary radio-xs mt-0.5"
                            />
                            <div>
                              <strong className="block text-base-content">Apenas Cadastros & Config</strong>
                              <span>Atualiza salas, serviços e preferências visuais. Mantém a fila atual intacta.</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    ) : null}

                    {progressoUpload !== null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-neutral">
                          <span>Restaurando banco...</span>
                          <span>{progressoUpload}%</span>
                        </div>
                        <progress className="progress progress-primary w-full" value={progressoUpload} max={100} />
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={executandoAcao}
                      onClick={executarImportacao}
                      className="btn btn-primary w-full gap-2"
                    >
                      {executandoAcao ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Processando Importação...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span>Confirmar e Importar Agora</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo da Aba Histórico de Backups */}
            {aba === 'backups' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-base-200/40 border border-base-300 rounded-xl p-3.5">
                  <div className="text-xs text-neutral">
                    Backups salvos no disco em <code className="text-base-content font-mono font-bold">data/backups/</code>.
                    O agendador diário mantém os últimos 14 dias automaticamente.
                  </div>
                  <button
                    type="button"
                    disabled={executandoAcao}
                    onClick={criarBackupManual}
                    className="btn btn-sm btn-primary gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Criar Backup Agora</span>
                  </button>
                </div>

                {backups.length === 0 ? (
                  <div className="text-center py-8 text-neutral border border-dashed border-base-300 rounded-xl">
                    <Clock className="h-8 w-8 mx-auto opacity-40 mb-2" />
                    <p className="text-sm font-semibold">Nenhum backup arquivado no momento.</p>
                    <p className="text-xs mt-1">Clique em "Criar Backup Agora" para salvar o primeiro snapshot.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-base-300 rounded-xl">
                    <table className="table table-sm w-full">
                      <thead>
                        <tr className="bg-base-200/80 text-neutral text-xs">
                          <th>Arquivo</th>
                          <th>Tipo</th>
                          <th>Data e Hora</th>
                          <th>Tamanho</th>
                          <th className="text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backups.map((b) => (
                          <tr key={b.arquivo} className="hover:bg-base-200/40">
                            <td className="font-mono text-xs font-bold text-base-content truncate max-w-[200px]">
                              {b.arquivo}
                            </td>
                            <td>{badgeTipo(b.tipo)}</td>
                            <td className="text-xs text-neutral">{formatarData(b.criado_em)}</td>
                            <td className="text-xs font-mono text-neutral">{formatarBytes(b.tamanho)}</td>
                            <td className="text-right space-x-1 whitespace-nowrap">
                              {confirmandoRestauracao === b.arquivo ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <span className="text-[11px] text-error font-semibold">Confirmar?</span>
                                  <button
                                    type="button"
                                    disabled={executandoAcao}
                                    onClick={() => restaurarBackupLocal(b.arquivo)}
                                    className="btn btn-error btn-xs"
                                  >
                                    Sim, Restaurar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmandoRestauracao(null)}
                                    className="btn btn-ghost btn-xs"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    title="Restaurar este backup"
                                    onClick={() => setConfirmandoRestauracao(b.arquivo)}
                                    className="btn btn-ghost btn-xs text-primary"
                                  >
                                    Restaurar
                                  </button>
                                  <button
                                    type="button"
                                    title="Baixar cópia (.db)"
                                    onClick={() => baixarBackupEspecifico(b.arquivo)}
                                    className="btn btn-ghost btn-xs text-neutral hover:text-base-content"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Excluir arquivo"
                                    onClick={() => excluirBackup(b.arquivo)}
                                    className="btn btn-ghost btn-xs text-neutral hover:text-error"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-between border-t border-base-300 px-6 py-3.5 bg-base-200/40">
          <div className="text-[11px] text-neutral flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>SQLite 3 nativo em modo WAL · Transações atômicas seguras</span>
          </div>
          <button type="button" onClick={onFechar} className="btn btn-sm btn-ghost">
            Fechar
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40 backdrop-blur-sm" onClick={onFechar} />
    </div>
  );
}
