import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import ReceptionPage from '@/pages/ReceptionPage';
import TvDisplayPage from '@/pages/TvDisplayPage';
import RoomCallerPage from '@/pages/RoomCallerPage';
import TotemPage from '@/pages/TotemPage';
import MetricsPage from '@/pages/MetricsPage';
import SettingsPage from '@/pages/SettingsPage';
import { Tv, DoorOpen, Users, Touchpad, BarChart3, Settings, WifiOff } from 'lucide-react';
import { useStore } from '@/lib/store';
import { ApiError } from '@/lib/api';

export default function App() {
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
      <Toaster richColors position="top-right" />
      {loaded && !online && (
        <div
          role="alert"
          className="fixed top-0 inset-x-0 z-[60] bg-rose-600 text-white text-sm font-semibold py-1.5 text-center flex items-center justify-center gap-2"
        >
          <WifiOff className="h-4 w-4" />
          Sem conexão com o servidor da clínica. Reconectando automaticamente...
        </div>
      )}
      {renderRoute()}

      {/* Seletor rápido de telas na LAN (oculto na TV e Totem) */}
      {!isKioskOrTv && (
        <nav
          aria-label="Navegação rápida"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-950/90 border border-slate-700/80 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl flex items-center gap-1.5 text-xs"
        >
          <button
            onClick={() => navigateTo('/')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition ${
              currentPath === '/' || currentPath === '/recepcao'
                ? 'bg-brand-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Recepção</span>
          </button>

          <button
            onClick={() => navigateTo('/chamar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition ${
              currentPath.startsWith('/chamar')
                ? 'bg-brand-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <DoorOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Consultório</span>
          </button>

          <button
            onClick={() => navigateTo('/tv')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition ${
              currentPath.startsWith('/tv')
                ? 'bg-brand-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Telão TV</span>
          </button>

          <button
            onClick={() => navigateTo('/totem')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition ${
              currentPath.startsWith('/totem')
                ? 'bg-brand-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Touchpad className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Totem Touch</span>
          </button>

          <button
            onClick={() => navigateTo('/metricas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition ${
              currentPath.startsWith('/metricas')
                ? 'bg-brand-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Métricas</span>
          </button>

          <button
            onClick={() => navigateTo('/config')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition ${
              currentPath.startsWith('/config')
                ? 'bg-brand-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ajustes</span>
          </button>
        </nav>
      )}
    </>
  );
}
