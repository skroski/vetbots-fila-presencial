import { useState, useMemo } from 'react';
import {
  Megaphone,
  UserCheck,
  CheckCircle2,
  Volume2,
  UserX,
  ArrowRightLeft,
  Clock,
  DoorOpen,
  Share2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useQueueSystem } from '@/hooks/useQueueSystem';
import { QUEUE_PRIORITY_LABEL, PRIORITY_STYLES, type QueueItem } from '@/types/queue';
import { tocarChimeFila } from '@/lib/audioChime';

export default function RoomCallerPage() {
  const { items, rooms, services, alterarStatus, chamarProximo, loading } = useQueueSystem();

  // Obtém sala da URL ou localStorage
  // Aceita /chamar/<id-da-sala> (atalho fixo no consultório) ou ?sala=<id>
  const urlParams = new URLSearchParams(window.location.search);
  const pathRoomId = window.location.pathname.split('/')[2] || '';
  const initialRoomId =
    pathRoomId || urlParams.get('sala') || localStorage.getItem('vet_caller_room_id') || '';

  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialRoomId);
  const [transferTarget, setTransferTarget] = useState<QueueItem | null>(null);
  const [transferRoom, setTransferRoom] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');

  const currentRoom = rooms.find((r) => r.id === selectedRoomId) || rooms.find((r) => r.ativa) || rooms[0];

  // Salva no localStorage quando o usuário altera a sala
  const handleSelectRoom = (id: string) => {
    setSelectedRoomId(id);
    localStorage.setItem('vet_caller_room_id', id);
  };

  // Paciente atualmente em atendimento ou chamado na sala selecionada
  const currentPatient = useMemo(() => {
    if (!currentRoom) return null;
    return items.find(
      (i) =>
        i.sala_id === currentRoom.id && (i.status === 'chamado' || i.status === 'em_atendimento')
    );
  }, [items, currentRoom]);

  // Próximos da fila (aguardando para esta sala ou fila geral)
  const waitingQueue = useMemo(() => {
    return items
      .filter((i) => i.status === 'aguardando' && (!i.sala_id || i.sala_id === currentRoom?.id))
      .sort((a, b) => {
        const pOrder = { emergencia: 0, prioridade: 1, normal: 2 };
        if (pOrder[a.prioridade] !== pOrder[b.prioridade]) {
          return pOrder[a.prioridade] - pOrder[b.prioridade];
        }
        return new Date(a.chegada_em).getTime() - new Date(b.chegada_em).getTime();
      });
  }, [items, currentRoom]);

  // Ação: Chamar Próximo (ou chamar item específico)
  const handleCallNext = async (specificItem?: QueueItem) => {
    if (!currentRoom) return;
    if (specificItem) {
      await alterarStatus(specificItem.id, 'chamar', { salaId: currentRoom.id });
    } else {
      // O servidor escolhe o próximo de forma atômica (duas salas nunca chamam o mesmo paciente)
      await chamarProximo(currentRoom.id);
    }
    tocarChimeFila();
  };

  // Ação: Repetir Chamada
  const handleRepeatCall = async () => {
    if (!currentPatient || !currentRoom) return;
    await alterarStatus(currentPatient.id, 'chamar', { salaId: currentRoom.id });
    tocarChimeFila();
  };

  // Ação: Iniciar Consulta
  const handleStart = async () => {
    if (!currentPatient) return;
    await alterarStatus(currentPatient.id, 'iniciar');
  };

  // Ação: Finalizar Consulta
  const handleFinish = async () => {
    if (!currentPatient) return;
    await alterarStatus(currentPatient.id, 'finalizar');
  };

  // Ação: Ausente
  const handleNoShow = async () => {
    if (!currentPatient) return;
    await alterarStatus(currentPatient.id, 'ausente');
  };

  // Ação: Retornar à Fila
  const handleReturnToQueue = async () => {
    if (!currentPatient) return;
    await alterarStatus(currentPatient.id, 'retornar');
  };

  // Confirmar Transferência
  const handleConfirmTransfer = async () => {
    if (!transferTarget) return;
    await alterarStatus(transferTarget.id, 'transferir', {
      salaId: transferRoom || undefined,
      motivo: transferReason,
    });
    setTransferTarget(null);
    setTransferReason('');
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col pb-28">
      {/* Barra de Seleção de Sala */}
      <header className="navbar bg-base-200 border-b border-base-300 px-4 py-3 flex-wrap justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-accent border border-primary/20">
            <DoorOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-neutral font-medium">Você está atendendo em:</span>
            <div className="flex items-center gap-2">
              <select
                value={currentRoom?.id || ''}
                onChange={(e) => handleSelectRoom(e.target.value)}
                className="select select-bordered select-sm font-bold text-base"
              >
                {rooms.filter((r) => r.ativa).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Link Rápido para a TV */}
        <div className="flex items-center gap-3">
          <a
            href="/tv"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
          >
            <Share2 className="h-4 w-4" />
            <span>Abrir Telão da TV</span>
          </a>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Atendimento Atual e Painel de Controle */}
        <div className="md:col-span-2 space-y-6">
          <div className="card bg-base-100 border border-base-300 shadow-soft p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-base-300 pb-4 mb-6">
              <span className="text-xs text-neutral font-bold flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
                Paciente na Sala
              </span>
              {currentPatient && (
                <span className={`${PRIORITY_STYLES[currentPatient.prioridade].badge} font-semibold`}>
                  {QUEUE_PRIORITY_LABEL[currentPatient.prioridade]}
                </span>
              )}
            </div>

            {currentPatient ? (
              <div className="space-y-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="font-mono text-6xl md:text-7xl font-black text-base-content">
                      {currentPatient.senha}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-base-content mt-1">
                      {currentPatient.pet_nome || 'Paciente sem nome'}
                    </h2>
                    <p className="text-neutral text-sm mt-0.5">
                      Tutor(a): <strong className="text-base-content">{currentPatient.tutor_nome}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`badge font-semibold ${
                        currentPatient.status === 'em_atendimento' ? 'badge-soft-primary' : 'badge-soft-warning'
                      }`}
                    >
                      {currentPatient.status === 'em_atendimento' ? 'Em Consulta' : 'Chamado no Telão'}
                    </span>
                  </div>
                </div>

                {currentPatient.motivo_resumido && (
                  <div className="alert bg-base-200 border border-base-300 text-sm text-base-content/80 block">
                    <strong className="text-neutral text-xs block mb-1">Motivo do Atendimento:</strong>
                    {currentPatient.motivo_resumido}
                  </div>
                )}

                {/* Grade de Botões de Ação do Médico */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-base-300">
                  <button
                    onClick={handleRepeatCall}
                    className="btn btn-outline btn-primary"
                  >
                    <Volume2 className="h-4 w-4" />
                    <span>Repetir Chamada</span>
                  </button>

                  {currentPatient.status === 'chamado' ? (
                    <button
                      onClick={handleStart}
                      className="btn btn-primary col-span-1 sm:col-span-2"
                    >
                      <UserCheck className="h-5 w-5" />
                      <span>Iniciar Consulta</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleFinish}
                      className="btn btn-primary col-span-1 sm:col-span-2"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Finalizar Consulta</span>
                    </button>
                  )}

                  <button
                    onClick={handleNoShow}
                    className="btn btn-ghost border-base-300 hover:bg-error/10 hover:text-error"
                  >
                    <UserX className="h-4 w-4" />
                    <span>Não Compareceu</span>
                  </button>

                  <button
                    onClick={handleReturnToQueue}
                    className="btn btn-ghost border-base-300"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Retornar à Fila</span>
                  </button>

                  <button
                    onClick={() => setTransferTarget(currentPatient)}
                    className="btn btn-ghost border-base-300 hover:bg-secondary/10 hover:text-secondary"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    <span>Transferir Sala</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-base-100 flex items-center justify-center text-neutral/70 border border-base-300">
                  <DoorOpen className="h-8 w-8 text-neutral" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-base-content">Consultório Livre</h3>
                  <p className="text-neutral text-sm mt-1">
                    Nenhum paciente está sendo atendido nesta sala no momento.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    disabled={waitingQueue.length === 0}
                    onClick={() => handleCallNext()}
                    className="btn btn-primary btn-lg gap-3"
                  >
                    <Megaphone className="h-6 w-6" />
                    <span>Chamar Próximo da Fila</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coluna 3: Próximos na Fila de Espera */}
        <div className="space-y-4">
          <div className="card bg-base-100 border border-base-300 shadow-soft p-6">
            <div className="flex items-center justify-between border-b border-base-300 pb-3 mb-4">
              <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                <span>Aguardando Chamada</span>
              </h3>
              <span className="badge badge-soft-neutral font-semibold">
                {waitingQueue.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {waitingQueue.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-lg border border-base-300 transition bg-base-100 hover:bg-base-200 flex items-center justify-between ${
                    PRIORITY_STYLES[item.prioridade].border
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-base-content">{item.senha}</span>
                      {item.prioridade !== 'normal' && (
                        <span className={`${PRIORITY_STYLES[item.prioridade].badge} badge-sm font-semibold`}>
                          {QUEUE_PRIORITY_LABEL[item.prioridade]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-base-content truncate mt-0.5">
                      {item.pet_nome || item.tutor_nome}
                    </p>
                    <span className="text-xs text-neutral block truncate">
                      {services.find((s) => s.id === item.servico_id)?.nome || 'Consulta'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCallNext(item)}
                    className="btn btn-ghost btn-square btn-sm shrink-0 hover:bg-primary hover:text-primary-content"
                    title="Chamar este paciente diretamente"
                  >
                    <Megaphone className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {waitingQueue.length === 0 && (
                <div className="text-center py-8 text-neutral text-xs">
                  Nenhum paciente aguardando para esta sala.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Transferência */}
      {transferTarget && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md space-y-4 p-8">
            <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-accent" />
              <span>Transferir Atendimento</span>
            </h3>
            <p className="text-xs text-neutral">
              Encaminhando a senha <strong className="text-base-content">{transferTarget.senha}</strong> ({transferTarget.pet_nome || transferTarget.tutor_nome}). O horário original de chegada será mantido na nova fila.
            </p>

            <div className="space-y-3">
              <div>
                <label className="label-text mb-1 block font-semibold">
                  Sala de Destino:
                </label>
                <select
                  value={transferRoom}
                  onChange={(e) => setTransferRoom(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="">Selecione a sala de destino...</option>
                  {rooms
                    .filter((r) => r.id !== currentRoom?.id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="label-text mb-1 block font-semibold">
                  Motivo da Transferência:
                </label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  rows={2}
                  placeholder="Ex: Encaminhado para exame de imagem ou sala de vacinas"
                  className="textarea textarea-bordered w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTransferTarget(null)}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmTransfer}
                className="btn btn-primary"
              >
                Confirmar Transferência
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
