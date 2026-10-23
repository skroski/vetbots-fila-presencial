import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster, toast } from 'sonner';
import ReceptionPage from '@/pages/ReceptionPage';
import TvDisplayPage from '@/pages/TvDisplayPage';
import RoomCallerPage from '@/pages/RoomCallerPage';
import TotemPage from '@/pages/TotemPage';
import MetricsPage from '@/pages/MetricsPage';
import SettingsPage from '@/pages/SettingsPage';
import { Tv, DoorOpen, Users, Touchpad, BarChart3, Settings, WifiOff, Sun, Moon, CircleHelp } from 'lucide-react';
import { useStore } from '@/lib/store';
import { ApiError } from '@/lib/api';

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
  const { online, loaded } = useStore();

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

  // O telão da TV é sempre escuro (sala de espera, vídeos); as demais telas seguem o tema escolhido
  const ehTv = currentPath.startsWith('/tv');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', ehTv || tema === 'dark' ? 'vetbots-dark' : 'vetbots');
  }, [tema, ehTv]);

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
          className="fixed bottom-4 left-1/2 z-40 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-0 rounded-full border border-base-300 bg-base-100/95 px-2 py-1 text-sm shadow-medium backdrop-blur-md sm:gap-1 sm:px-3"
        >
          {ROTAS.map(({ caminho, exato, rotulo, Icone }) => {
            const ativa = exato ? currentPath === '/' || currentPath === '/recepcao' : currentPath.startsWith(caminho);
            return (
              <button
                key={caminho}
                onClick={() => navigateTo(caminho)}
                aria-current={ativa ? 'page' : undefined}
                className={`btn btn-sm h-12 min-h-12 min-w-12 whitespace-nowrap rounded-full border-0 px-2 font-medium sm:px-3 ${
                  ativa ? 'btn-primary font-semibold' : 'btn-ghost text-neutral'
                }`}
              >
                <Icone className="h-4 w-4" />
                <span className="hidden sm:inline">{rotulo}</span>
              </button>
            );
          })}

          {/* Guia de instalação e tour guiado (servidos em /ajuda/); abre em outra aba para não perder a tela atual */}
          <a
            href="/ajuda/"
            target="_blank"
            rel="noopener"
            title="Ajuda: guia de instalação e tour guiado"
            className="btn btn-ghost btn-sm h-12 min-h-12 min-w-12 whitespace-nowrap rounded-full border-0 px-2 font-medium text-neutral sm:px-3"
          >
            <CircleHelp className="h-4 w-4" />
            <span className="hidden sm:inline">Ajuda</span>
          </a>

          <button
            onClick={alternarTema}
            aria-label={tema === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            title={tema === 'dark' ? 'Tema claro' : 'Tema escuro'}
            className="btn btn-ghost btn-circle h-12 min-h-12 w-12 text-neutral"
          >
            {tema === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>
      )}
    </>
  );
}
