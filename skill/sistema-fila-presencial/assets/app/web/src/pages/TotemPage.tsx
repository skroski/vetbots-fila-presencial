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
    <div className="min-h-screen bg-base-200 text-base-content flex flex-col justify-between p-6 md:p-12 select-none">
      {/* Topo do Totem */}
      <header className="text-center max-w-2xl mx-auto space-y-2">
        <BrandMark size="lg" className="mx-auto mb-2" />
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-base-content">{config.clinic_name}</h1>
        <p className="text-neutral text-base md:text-lg">
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
              className="btn btn-error h-auto min-h-0 w-full flex-nowrap justify-between p-6 md:p-8 text-left font-normal shadow-medium"
            >
              <div className="flex items-center gap-5 text-left">
                <div className="h-16 w-16 rounded-lg bg-white/20 flex items-center justify-center text-3xl">
                  🚨
                </div>
                <div>
                  <span className="text-xs font-semibold text-error-content/90">
                    Atendimento Imediato
                  </span>
                  <h2 className="text-2xl md:text-4xl font-black">EMERGÊNCIA VETERINÁRIA</h2>
                  <p className="text-sm mt-1 text-error-content/90">
                    Para pets com risco à vida, convulsão, trauma grave ou dificuldade respiratória
                  </p>
                </div>
              </div>
              <ChevronRight className="h-8 w-8 text-error-content/80" />
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
                  className="btn group h-auto min-h-0 flex-nowrap justify-between border-base-300 bg-base-100 p-6 text-left font-normal shadow-soft hover:border-primary/50 hover:bg-base-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-accent group-hover:bg-primary group-hover:text-primary-content flex items-center justify-center font-bold text-xl transition">
                      {service.prefixo}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-base-content group-hover:text-accent transition">
                        {service.nome}
                      </h3>
                      <span className="text-xs text-neutral">Toque para retirar senha</span>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-neutral/70 group-hover:text-accent transition" />
                </button>
              ))}
          </div>
        </main>
      )}

      {/* Passo 2: Formulário Ágil de Tutor e Pet */}
      {step === 'details' && (
        <main className="card max-w-xl w-full mx-auto my-auto bg-base-100 border border-base-300 p-8 shadow-medium space-y-6">
          <div className="flex items-center justify-between border-b border-base-300 pb-4">
            <button
              onClick={() => setStep('selection')}
              className="btn btn-ghost"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </button>
            <span className={`badge badge-lg font-semibold ${isEmergency ? 'badge-soft-error' : 'badge-soft-primary'}`}>
              {isEmergency ? 'Emergência' : selectedService?.nome}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-base-content mb-2">
                Nome do Tutor (Responsável) *
              </label>
              <input
                type="text"
                value={tutorName}
                onChange={(e) => setTutorName(e.target.value)}
                placeholder="Ex: Carlos Alberto"
                className="input input-bordered input-lg w-full"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-base-content mb-2">
                Nome do Pet (Opcional)
              </label>
              <input
                type="text"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="Ex: Thor, Mel, Bob"
                className="input input-bordered input-lg w-full"
              />
            </div>

            {/* Opção de Atendimento Preferencial */}
            {!isEmergency && (
              <label className="label cursor-pointer justify-start gap-3 rounded-lg border border-base-300 bg-base-200 p-4">
                <input
                  type="checkbox"
                  checked={isPreferential}
                  onChange={(e) => setIsPreferential(e.target.checked)}
                  className="checkbox checkbox-primary"
                />
                <span className="text-sm text-base-content/80 font-medium">
                  Atendimento Preferencial (Lei 10.048: 60+ anos, gestantes, PCD ou colo)
                </span>
              </label>
            )}
          </div>

          <button
            disabled={!tutorName.trim()}
            onClick={handleConfirmIssue}
            className="btn btn-primary btn-lg w-full gap-3 text-xl"
          >
            <Printer className="h-6 w-6" />
            <span>Emitir Senha Agora</span>
          </button>
        </main>
      )}

      {/* Passo 3: Senha Emitida com Sucesso */}
      {step === 'success' && issuedTicket && (
        <main className="card max-w-md w-full mx-auto my-auto bg-base-100 border-2 border-primary/40 p-8 text-center space-y-6 shadow-medium">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/15 text-accent flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div>
            <span className="text-xs text-neutral font-bold">
              Senha Gerada com Sucesso
            </span>
            <div className="font-mono text-7xl font-black text-base-content mt-2">
              {issuedTicket.ticket}
            </div>
            <p className="text-accent font-bold text-lg mt-1">{issuedTicket.serviceName}</p>
          </div>

          <div className="bg-base-200 p-4 rounded-lg text-left text-sm text-base-content/80 space-y-1">
            <div>
              <strong>Tutor:</strong> {issuedTicket.tutorName}
            </div>
            {issuedTicket.petName && (
              <div>
                <strong>Pet:</strong> {issuedTicket.petName}
              </div>
            )}
            <div className="text-xs text-neutral pt-2 border-t border-base-300">
              Retire seu cupom impresso abaixo e aguarde a chamada no telão da TV.
            </div>
          </div>

          <div className="text-xs text-neutral flex items-center justify-center gap-2">
            <span>Retornando à tela inicial em {countdown} segundos...</span>
          </div>

          <button
            onClick={handleReset}
            className="btn btn-outline btn-primary w-full"
          >
            Concluir e Voltar ao Início
          </button>
        </main>
      )}

      {/* Rodapé */}
      <footer className="text-center text-xs text-neutral">
        VetBots Presencial • Sistema de Autoatendimento Clínico
      </footer>
    </div>
  );
}
