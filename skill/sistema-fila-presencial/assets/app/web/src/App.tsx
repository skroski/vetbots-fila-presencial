import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster, toast } from 'sonner';
import ReceptionPage from '@/pages/ReceptionPage';
import TvDisplayPage from '@/pages/TvDisplayPage';
import RoomCallerPage from '@/pages/RoomCallerPage';
import TotemPage from '@/pages/TotemPage';
import MetricsPage from '@/pages/MetricsPage';
import SettingsPage from '@/pages/SettingsPage';
import { Tv, DoorOpen, Users, Touchpad, BarChart3, Settings, WifiOff, Sun, Moon, CircleHelp, Heart, Copy, ExternalLink, X, Database } from 'lucide-react';
import { useStore } from '@/lib/store';
import { ApiError } from '@/lib/api';
import ModalDadosBackup from '@/components/ModalDadosBackup';

type Tema = 'light' | 'dark';

// Só existe no build de demonstração (vite build --mode demo); no sistema real o trecho é removido.
const DemoBadge = import.meta.env.MODE === 'demo' ? lazy(() => import('@/demo/DemoBadge')) : null;

const ROTAS = [
  { caminho: '/', exato: true, rotulo: 'Recepção', Icone: Users },
  { caminho: '/chamar', rotulo: 'Consultório', Icone: DoorOpen },
  { caminho: '/tv', rotulo: 'Telão TV', Icone: Tv },
  { caminho: '/totem', rotulo: 'Totem Touch', Icone: Touchpad },
  { caminho: '/metricas', rotulo: 'Métricas', Icone: BarChart3 },
  { caminho: '/config', rotulo: 'Ajustes', Icone: Settings },
];

function temaSalvo(): Tema {
  try {
    const t = localStorage.getItem('fila-tema');
    if (t === 'light' || t === 'dark') return t;
  } catch {
    /* armazenamento indisponível: segue o sistema */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [tema, setTema] = useState<Tema>(temaSalvo);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [modalApoio, setModalApoio] = useState(false);
  const [modalDadosAberto, setModalDadosAberto] = useState(false);
  const { online, loaded } = useStore();

  // Escuta evento customizado para abrir o modal de Dados & Backup de qualquer tela
  useEffect(() => {
    const abrir = () => setModalDadosAberto(true);
    window.addEventListener('abrir-dados-backup', abrir);
    return () => window.removeEventListener('abrir-dados-backup', abrir);
  }, []);

  // Qualquer erro vindo do servidor (ex.: "Nenhum paciente aguardando") vira um aviso na tela
  useEffect(() => {
    const aviso = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof ApiError) {
        e.preventDefault();
        toast.error(e.reason.message);
      }
    };
    window.addEventListener('unhandledrejection', aviso);
    return () => window.removeEventListener('unhandledrejection', aviso);
  }, []);

  // Escuta mudanças de navegação no histórico do navegador
  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // O telão da TV segue o tema configurado em /config (ou escuro por padrão); as demais telas seguem o tema escolhido no app
  const ehTv = currentPath.startsWith('/tv');
  const { config } = useStore();
  useEffect(() => {
    if (ehTv) {
      document.documentElement.setAttribute('data-theme', config.tv_theme === 'light' ? 'vetbots' : 'vetbots-dark');
    } else {
      document.documentElement.setAttribute('data-theme', tema === 'dark' ? 'vetbots-dark' : 'vetbots');
    }
  }, [tema, ehTv, config.tv_theme]);

  const alternarTema = () => {
    const novo: Tema = tema === 'dark' ? 'light' : 'dark';
    setTema(novo);
    try {
      localStorage.setItem('fila-tema', novo);
    } catch {
      /* sem armazenamento: vale só nesta sessão */
    }
  };

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Renderiza a página correspondente à rota
  const renderRoute = () => {
    if (currentPath.startsWith('/tv')) return <TvDisplayPage />;
    if (currentPath.startsWith('/chamar')) return <RoomCallerPage />;
    if (currentPath.startsWith('/totem')) return <TotemPage />;
    if (currentPath.startsWith('/metricas')) return <MetricsPage />;
    if (currentPath.startsWith('/config')) return <SettingsPage />;
    return <ReceptionPage />;
  };

  // Oculta a barra de navegação no telão da TV e no Totem para não poluir
  const isKioskOrTv = currentPath.startsWith('/tv') || currentPath.startsWith('/totem');

  return (
    <>
      <Toaster richColors closeButton position="top-right" />
      {loaded && !online && (
        <div role="alert" className="alert alert-error fixed top-0 inset-x-0 z-[60] justify-center rounded-none py-1.5 text-sm font-semibold">
          <WifiOff className="h-4 w-4" />
          <span>Sem conexão com o servidor da clínica. Reconectando automaticamente...</span>
        </div>
      )}
      {renderRoute()}
      {DemoBadge && !isKioskOrTv && (
        <Suspense fallback={null}>
          <DemoBadge />
        </Suspense>
      )}

      {/* Seletor rápido de telas na LAN (oculto na TV e Totem) */}
      {!isKioskOrTv && (
        <nav
          aria-label="Navegação rápida"
          className="fixed bottom-3 sm:bottom-4 left-1/2 z-40 flex max-w-[calc(100vw-0.75rem)] -translate-x-1/2 items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar rounded-full border border-base-300/90 bg-base-100/95 px-1.5 py-1 text-sm shadow-xl backdrop-blur-lg sm:px-3"
        >
          {ROTAS.map(({ caminho, exato, rotulo, Icone }) => {
            const ativa = exato ? currentPath === '/' || currentPath === '/recepcao' : currentPath.startsWith(caminho);
            const abreEmNovaAba = caminho === '/tv' || caminho === '/totem';

            if (abreEmNovaAba) {
              return (
                <a
                  key={caminho}
                  href={caminho}
                  target="_blank"
                  rel="noreferrer"
                  title={`${rotulo} (abre em nova aba)`}
                  className="btn btn-ghost h-10 min-h-10 min-w-10 sm:h-11 sm:min-h-11 sm:min-w-11 whitespace-nowrap rounded-full border-0 px-2 font-medium text-neutral hover:text-base-content sm:px-3"
                >
                  <Icone className="h-4 w-4" />
                  <span className="hidden sm:inline">{rotulo}</span>
                </a>
              );
            }

            return (
              <button
                key={caminho}
                onClick={() => navigateTo(caminho)}
                aria-current={ativa ? 'page' : undefined}
                className={`btn btn-sm h-10 min-h-10 min-w-10 sm:h-11 sm:min-h-11 sm:min-w-11 whitespace-nowrap rounded-full border-0 px-2 font-medium sm:px-3 ${
                  ativa ? 'btn-primary font-semibold shadow-sm' : 'btn-ghost text-neutral hover:text-base-content'
                }`}
              >
                <Icone className="h-4 w-4" />
                <span className="hidden sm:inline">{rotulo}</span>
              </button>
            );
          })}

          {/* Divisor vertical sutil entre telas operacionais e utilitários de sistema */}
          <div className="h-4 sm:h-5 w-[1px] bg-base-300 mx-0.5 shrink-0" aria-hidden="true" />

          {/* Persistência & Backup de Dados */}
          <button
            onClick={() => setModalDadosAberto(true)}
            title="Persistência & Backup: Importar, Exportar e Restaurar dados locais"
            aria-label="Persistência e Backup de Dados"
            className={`btn btn-sm h-10 min-h-10 min-w-10 sm:h-11 sm:min-h-11 sm:min-w-11 whitespace-nowrap rounded-full border-0 px-2 font-medium sm:px-3 ${
              modalDadosAberto ? 'btn-primary font-semibold shadow-sm' : 'btn-ghost text-neutral hover:text-base-content'
            }`}
          >
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Dados</span>
          </button>

          {/* Guia de instalação e tour guiado (servidos em /ajuda/); abre em outra aba para não perder a tela atual */}
          <a
            href="/ajuda/"
            target="_blank"
            rel="noopener"
            title="Ajuda: guia de instalação e tour guiado"
            className="btn btn-ghost btn-sm h-10 min-h-10 min-w-10 sm:h-11 sm:min-h-11 sm:min-w-11 whitespace-nowrap rounded-full border-0 px-2 font-medium text-neutral hover:text-base-content sm:px-3"
          >
            <CircleHelp className="h-4 w-4" />
            <span className="hidden sm:inline">Ajuda</span>
          </a>

          {/* Apoio ao projeto, Pix e Consultoria */}
          <button
            onClick={() => setModalApoio(true)}
            title="Apoio ao projeto, Pix & Consultoria"
            className="btn btn-ghost btn-sm h-10 min-h-10 min-w-10 sm:h-11 sm:min-h-11 sm:min-w-11 whitespace-nowrap rounded-full border-0 px-2 font-medium text-neutral sm:px-3 hover:text-rose-500"
          >
            <Heart className="h-4 w-4 text-rose-500" />
            <span className="hidden sm:inline">Apoiar</span>
          </button>

          <button
            onClick={alternarTema}
            aria-label={tema === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            title={tema === 'dark' ? 'Tema claro' : 'Tema escuro'}
            className="btn btn-ghost btn-circle h-10 min-h-10 w-10 sm:h-11 sm:min-h-11 sm:w-11 text-neutral hover:text-base-content"
          >
            {tema === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>
      )}

      {/* Modal de Persistência e Backup de Dados */}
      <ModalDadosBackup aberto={modalDadosAberto} onFechar={() => setModalDadosAberto(false)} />

      {modalApoio && (
        <div className="modal modal-open z-50">
          <div className="modal-box max-w-lg p-6 space-y-4 bg-base-100 text-base-content border border-base-300 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-base-300">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500 fill-rose-500/20" />
                <h3 className="font-bold text-base text-base-content">Apoio, Pix & Consultoria</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-circle"
                onClick={() => setModalApoio(false)}
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral">
              <div className="bg-base-200/70 p-3.5 rounded-xl border border-base-300 space-y-2">
                <p className="font-bold text-base-content text-sm">💚 Conseguiu instalar e usar com sucesso?</p>
                <p className="leading-relaxed">
                  Se este sistema organizou o atendimento da sua clínica e está rodando bem no dia a dia,{' '}
                  <strong className="text-base-content">considere colaborar com o projeto!</strong> Sua ajuda mantém o software vivo,
                  livre e em constante evolução.
                </p>
                <p className="leading-relaxed">
                  Você também pode propor melhorias, criar novas funcionalidades ou{' '}
                  <strong className="text-base-content">apadrinhar funcionalidades</strong> sob medida para a sua clínica.
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 bg-base-100 p-2.5 rounded-lg border border-base-300 mt-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral block">Chave Pix para doações</span>
                    <code className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400">4199865410</code>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary gap-1"
                    onClick={() => {
                      void navigator.clipboard?.writeText('4199865410');
                      toast.success('Chave Pix 4199865410 copiada!');
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar Pix
                  </button>
                </div>
              </div>

              <div className="bg-base-200/70 p-3.5 rounded-xl border border-base-300 space-y-2">
                <p className="font-bold text-base-content text-sm">🛠️ Precisa de ajuda para instalar e botar em prática?</p>
                <p className="leading-relaxed">
                  Podemos ser contratados para prestar <strong className="text-base-content">consultoria por hora</strong> para instalar,
                  configurar a rede local (Wi-Fi/LAN), conectar a TV, o totem touch, a impressora térmica e treinar sua equipe.
                </p>
                <a
                  href="https://wa.me/554199865410"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline gap-2 w-full justify-center"
                >
                  Falar no WhatsApp: (41) 99865-410
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="p-2 text-neutral text-[11px] leading-relaxed">
                💻 Se você for um desenvolvedor, <strong className="text-base-content">colabore com o projeto Open Source, não seja mala!</strong>{' '}
                Envie pull requests, reporte melhorias e ajude no repositório{' '}
                <a
                  href="https://github.com/skroski/vetbots-fila-presencial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline font-semibold inline-flex items-center gap-1"
                >
                  GitHub <ExternalLink className="h-3 w-3" />
                </a>
                .
              </div>
            </div>

            <div className="modal-action justify-end pt-1">
              <button className="btn btn-ghost btn-sm" onClick={() => setModalApoio(false)}>
                Fechar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setModalApoio(false)} />
        </div>
      )}
    </>
  );
}
