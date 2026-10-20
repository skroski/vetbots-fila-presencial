import { useStore } from '@/lib/store';

const TAMANHOS = {
  sm: { caixa: 'h-10 w-10 text-xl rounded-xl', img: 'h-10 max-w-[9rem]' },
  md: { caixa: 'h-12 w-12 text-2xl rounded-2xl', img: 'h-12 max-w-[12rem]' },
  lg: { caixa: 'h-20 w-20 text-5xl rounded-3xl', img: 'h-24 max-w-[22rem]' },
};

/** Logotipo da clínica (enviado em /config) ou, se não houver, o ícone padrão. */
export default function BrandMark({ size = 'sm', className = '' }: { size?: keyof typeof TAMANHOS; className?: string }) {
  const { config } = useStore();
  const t = TAMANHOS[size];
  if (config.logo_url) {
    return <img src={config.logo_url} alt={config.clinic_name} className={`${t.img} w-auto object-contain ${className}`} />;
  }
  return (
    <div
      aria-hidden
      className={`${t.caixa} bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold border border-brand-500/20 ${className}`}
    >
      🐾
    </div>
  );
}
