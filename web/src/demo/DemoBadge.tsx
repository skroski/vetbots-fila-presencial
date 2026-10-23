import { useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { reiniciarDemo } from '@/demo/demoApi';

const CHAVE = 'fila-demo-aviso-fechado';

const jaFechado = () => {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
};

/** Aviso fixo da versão de demonstração. Pode ser fechado (a escolha fica salva neste navegador). */
export default function DemoBadge() {
  const [aberto, setAberto] = useState(() => !jaFechado());
  if (!aberto) return null;

  const fechar = () => {
    setAberto(false);
    try {
      localStorage.setItem(CHAVE, '1');
    } catch {
      /* sem armazenamento: o aviso volta ao recarregar */
    }
  };

  return (
    <div className="fixed bottom-20 left-2 z-50 flex max-w-[calc(100vw-1rem)] items-center gap-2 rounded-full border border-warning/40 bg-base-100/95 py-1 pl-3 pr-1 text-xs shadow-medium backdrop-blur-md xl:bottom-4">
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
      <button onClick={fechar} className="btn btn-ghost btn-circle btn-xs" aria-label="Fechar aviso" title="Fechar aviso">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
