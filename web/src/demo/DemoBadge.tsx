import { RotateCcw } from 'lucide-react';
import { reiniciarDemo } from '@/demo/demoApi';

/** Aviso fixo da versão de demonstração (some no telão da TV e no totem). */
export default function DemoBadge() {
  return (
    <div className="fixed bottom-20 left-2 z-50 xl:bottom-4 flex max-w-[calc(100vw-1rem)] items-center gap-2 rounded-full border border-warning/40 bg-base-100/95 px-3 py-1 text-xs shadow-medium backdrop-blur-md">
      <span className="font-bold text-warning">DEMONSTRAÇÃO</span>
      <span className="hidden text-base-content/70 sm:inline">dados fictícios, salvos só neste navegador</span>
      <button
        onClick={() => {
          if (confirm('Voltar aos dados de exemplo? O que você fez na demonstração será apagado.')) reiniciarDemo();
        }}
        className="btn btn-ghost btn-xs gap-1"
        title="Reiniciar a demonstração"
      >
        <RotateCcw className="h-3 w-3" />
        Reiniciar
      </button>
    </div>
  );
}
