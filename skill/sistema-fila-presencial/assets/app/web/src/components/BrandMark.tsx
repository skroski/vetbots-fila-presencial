import { useStore } from '@/lib/store';

const TAMANHOS = {
  sm: { img: 'h-10 max-w-[9rem]', padrao: 'h-8' },
  md: { img: 'h-12 max-w-[12rem]', padrao: 'h-10' },
  lg: { img: 'h-24 max-w-[22rem]', padrao: 'h-16' },
};

/** Logotipo da clínica (enviado em /config) ou, se não houver, a marca VetBots com nome. */
export default function BrandMark({ size = 'sm', className = '' }: { size?: keyof typeof TAMANHOS; className?: string }) {
  const { config } = useStore();
  const t = TAMANHOS[size];
  if (config.logo_url) {
    return <img src={config.logo_url} alt={config.clinic_name} className={`${t.img} w-auto object-contain ${className}`} />;
  }
  return (
    <>
      <img src="/logo-vetbots-claro.webp" alt="VetBots" className={`${t.padrao} w-auto dark:hidden ${className}`} />
      <img src="/logo-vetbots-escuro.webp" alt="VetBots" className={`${t.padrao} hidden w-auto dark:block ${className}`} />
    </>
  );
}
