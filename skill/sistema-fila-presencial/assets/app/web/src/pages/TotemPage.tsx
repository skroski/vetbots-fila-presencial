import { useState, useEffect } from 'react';
import {
  AlertCircle,
  Stethoscope,
  RotateCcw,
  Syringe,
  FlaskConical,
  HeartHandshake,
  CheckCircle2,
  Printer,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { useQueueSystem } from '@/hooks/useQueueSystem';
import { imprimirSenhaTermica, opcoesTicket } from '@/lib/printer';
import BrandMark from '@/components/BrandMark';
import { toast } from 'sonner';
import type { QueuePriority } from '@/types/queue';

export default function TotemPage() {
  const { services, config, adicionarItem } = useQueueSystem();

  const [step, setStep] = useState<'selection' | 'details' | 'success'>('selection');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [isPreferential, setIsPreferential] = useState(false);
  const [tutorName, setTutorName] = useState('');
  const [petName, setPetName] = useState('');
  const [issuedTicket, setIssuedTicket] = useState<{
    ticket: string;
    serviceName: string;
    tutorName: string;
    petName?: string;
  } | null>(null);
  const [countdown, setCountdown] = useState(8);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Timer de retorno automático após emitir senha
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (step === 'success') {
      setCountdown(8);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleReset();
            return 8;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step]);

  const handleSelectService = (serviceId: string, emergency = false) => {
    setSelectedServiceId(serviceId);
    setIsEmergency(emergency);
    setIsPreferential(false);
    setTutorName('');
    setPetName('');
    setStep('details');
  };

  const handleConfirmIssue = async () => {
    if (!tutorName.trim()) return;

    let priority: QueuePriority = 'normal';
    if (isEmergency) priority = 'emergencia';
    else if (isPreferential) priority = 'prioridade';

    // Se for emergência e não houver serviço específico, usa o primeiro que encontrar
    const targetServiceId =
      selectedServiceId || services.find((s) => s.prefixo === 'X')?.id || services[0]?.id;

    try {
      const item = await adicionarItem({
        servicoId: targetServiceId,
        tutorNome: tutorName.trim(),
        petNome: petName.trim() || undefined,
        prioridade: priority,
      });

      const sName = services.find((s) => s.id === targetServiceId)?.nome || 'Atendimento';

      setIssuedTicket({
        ticket: item.senha,
        serviceName: sName,
        tutorName: tutorName.trim(),
        petName: petName.trim() || undefined,
      });

      // Dispara impressão térmica automática
      imprimirSenhaTermica({
        ticket: item.senha,
        serviceName: sName,
        tutorName: tutorName.trim(),
        petName: petName.trim() || null,
        priority: priority === 'emergencia' ? 'EMERGÊNCIA' : priority === 'prioridade' ? 'PREFERENCIAL' : 'NORMAL',
        ...opcoesTicket(config),
      });

      setStep('success');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível emitir a senha. Procure a recepção.');
    }
  };

  const handleReset = () => {
    setStep('selection');
    setSelectedServiceId('');
    setIsEmergency(false);
    setIsPreferential(false);
    setTutorName('');
    setPetName('');
    setIssuedTicket(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white flex flex-col justify-between p-6 md:p-12 select-none">
      {/* Topo do Totem */}
      <header className="text-center max-w-2xl mx-auto space-y-2">
        <BrandMark size="lg" className="mx-auto mb-2" />
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">{config.clinic_name}</h1>
        <p className="text-slate-400 text-base md:text-lg">
          Toque na tela para retirar sua senha de atendimento
        </p>
      </header>

      {/* Passo 1: Seleção de Tipo de Atendimento */}
      {step === 'selection' && (
        <main className="max-w-4xl w-full mx-auto my-auto py-8">
          {/* Botão de Emergência Destacado */}
          <div className="mb-6">
            <button
              onClick={() => {
                const emgSrv = services.find((s) => s.prefixo === 'X') || services[0];
                handleSelectService(emgSrv.id, true);
              }}
              className="w-full bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white p-6 md:p-8 rounded-3xl shadow-2xl shadow-rose-900/40 border-2 border-rose-400/30 flex items-center justify-between transform active:scale-98 transition"
            >
              <div className="flex items-center gap-5 text-left">
                <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
                  🚨
                </div>
                <div>
                  <span className="text-xs uppercase tracking-widest text-rose-200 font-bold">
                    Atendimento Imediato
                  </span>
                  <h2 className="text-2xl md:text-4xl font-black">EMERGÊNCIA VETERINÁRIA</h2>
                  <p className="text-rose-100 text-sm mt-1">
                    Para pets com risco à vida, convulsão, trauma grave ou dificuldade respiratória
                  </p>
                </div>
              </div>
              <ChevronRight className="h-8 w-8 text-white/80" />
            </button>
          </div>

          {/* Grade de Atendimentos Regulares */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services
              .filter((s) => s.prefixo !== 'X')
              .map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleSelectService(service.id, false)}
                  className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-brand-500/50 p-6 rounded-2xl text-left flex items-center justify-between shadow-lg transform active:scale-98 transition group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-brand-500/10 text-brand-400 group-hover:bg-brand-500 group-hover:text-white flex items-center justify-center font-bold text-xl transition">
                      {service.prefixo}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-brand-300 transition">
                        {service.nome}
                      </h3>
                      <span className="text-xs text-slate-400">Toque para retirar senha</span>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-slate-600 group-hover:text-brand-400 transition" />
                </button>
              ))}
          </div>
        </main>
      )}

      {/* Passo 2: Formulário Ágil de Tutor e Pet */}
      {step === 'details' && (
        <main className="max-w-xl w-full mx-auto my-auto bg-slate-900/95 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <button
              onClick={() => setStep('selection')}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </button>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                isEmergency
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
              }`}
            >
              {isEmergency ? 'Emergência' : selectedService?.nome}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-2">
                Nome do Tutor (Responsável) *
              </label>
              <input
                type="text"
                value={tutorName}
                onChange={(e) => setTutorName(e.target.value)}
                placeholder="Ex: Carlos Alberto"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xl text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-200 mb-2">
                Nome do Pet (Opcional)
              </label>
              <input
                type="text"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="Ex: Thor, Mel, Bob"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xl text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Opção de Atendimento Preferencial */}
            {!isEmergency && (
              <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPreferential}
                  onChange={(e) => setIsPreferential(e.target.checked)}
                  className="h-5 w-5 rounded bg-slate-800 border-slate-700 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-300 font-medium">
                  Atendimento Preferencial (Lei 10.048: 60+ anos, gestantes, PCD ou colo)
                </span>
              </label>
            )}
          </div>

          <button
            disabled={!tutorName.trim()}
            onClick={handleConfirmIssue}
            className={`w-full py-5 rounded-2xl font-black text-xl shadow-xl flex items-center justify-center gap-3 transition transform active:scale-98 ${
              tutorName.trim()
                ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-900/40'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Printer className="h-6 w-6" />
            <span>Emitir Senha Agora</span>
          </button>
        </main>
      )}

      {/* Passo 3: Senha Emitida com Sucesso */}
      {step === 'success' && issuedTicket && (
        <main className="max-w-md w-full mx-auto my-auto bg-slate-900/95 border-2 border-brand-500/40 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="h-16 w-16 mx-auto rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div>
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
              Senha Gerada com Sucesso
            </span>
            <div className="font-mono text-7xl font-black text-white mt-2">
              {issuedTicket.ticket}
            </div>
            <p className="text-brand-400 font-bold text-lg mt-1">{issuedTicket.serviceName}</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl text-left text-sm text-slate-300 space-y-1">
            <div>
              <strong>Tutor:</strong> {issuedTicket.tutorName}
            </div>
            {issuedTicket.petName && (
              <div>
                <strong>Pet:</strong> {issuedTicket.petName}
              </div>
            )}
            <div className="text-xs text-slate-400 pt-2 border-t border-slate-800">
              Retire seu cupom impresso abaixo e aguarde a chamada no telão da TV.
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-center gap-2">
            <span>Retornando à tela inicial em {countdown} segundos...</span>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl transition"
          >
            Concluir e Voltar ao Início
          </button>
        </main>
      )}

      {/* Rodapé */}
      <footer className="text-center text-xs text-slate-500">
        VetBots Presencial • Sistema de Autoatendimento Clínico
      </footer>
    </div>
  );
}
