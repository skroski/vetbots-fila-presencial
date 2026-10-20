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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Barra de Seleção de Sala */}
      <header className="border-b border-slate-800 bg-slate-950/80 px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <DoorOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Você está atendendo em:</span>
            <div className="flex items-center gap-2">
              <select
                value={currentRoom?.id || ''}
                onChange={(e) => handleSelectRoom(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white font-bold text-base rounded-lg px-3 py-1 focus:ring-2 focus:ring-brand-500 focus:outline-none"
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
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition"
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
          <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-400 animate-ping" />
                Paciente na Sala
              </span>
              {currentPatient && (
                <span
                  className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                    PRIORITY_STYLES[currentPatient.prioridade].badge
                  }`}
                >
                  {QUEUE_PRIORITY_LABEL[currentPatient.prioridade]}
                </span>
              )}
            </div>

            {currentPatient ? (
              <div className="space-y-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="font-mono text-6xl md:text-7xl font-black text-white">
                      {currentPatient.senha}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
                      {currentPatient.pet_nome || 'Paciente sem nome'}
                    </h2>
                    <p className="text-slate-400 text-sm mt-0.5">
                      Tutor(a): <strong className="text-slate-200">{currentPatient.tutor_nome}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        currentPatient.status === 'em_atendimento'
                          ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {currentPatient.status === 'em_atendimento' ? 'Em Consulta' : 'Chamado no Telão'}
                    </span>
                  </div>
                </div>

                {currentPatient.motivo_resumido && (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-300">
                    <strong className="text-slate-400 text-xs block mb-1">Motivo do Atendimento:</strong>
                    {currentPatient.motivo_resumido}
                  </div>
                )}

                {/* Grade de Botões de Ação do Médico */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800/80">
                  <button
                    onClick={handleRepeatCall}
                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3.5 px-4 rounded-xl transition"
                  >
                    <Volume2 className="h-4 w-4 text-brand-400" />
                    <span>Repetir Chamada</span>
                  </button>

                  {currentPatient.status === 'chamado' ? (
                    <button
                      onClick={handleStart}
                      className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-900/30 transition col-span-1 sm:col-span-2"
                    >
                      <UserCheck className="h-5 w-5" />
                      <span>Iniciar Consulta</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleFinish}
                      className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-900/30 transition col-span-1 sm:col-span-2"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Finalizar Consulta</span>
                    </button>
                  )}

                  <button
                    onClick={handleNoShow}
                    className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl py-3 px-3 text-xs transition"
                  >
                    <UserX className="h-4 w-4" />
                    <span>Não Compareceu</span>
                  </button>

                  <button
                    onClick={handleReturnToQueue}
                    className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl py-3 px-3 text-xs transition"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Retornar à Fila</span>
                  </button>

                  <button
                    onClick={() => setTransferTarget(currentPatient)}
                    className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-400 border border-slate-800 rounded-xl py-3 px-3 text-xs transition"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    <span>Transferir Sala</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-slate-900 flex items-center justify-center text-slate-600 border border-slate-800">
                  <DoorOpen className="h-8 w-8 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Consultório Livre</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Nenhum paciente está sendo atendido nesta sala no momento.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    disabled={waitingQueue.length === 0}
                    onClick={() => handleCallNext()}
                    className={`inline-flex items-center gap-3 font-black text-lg py-4 px-8 rounded-2xl shadow-xl transition transform active:scale-95 ${
                      waitingQueue.length > 0
                        ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-900/40'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
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
          <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-400" />
                <span>Aguardando Chamada</span>
              </h3>
              <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {waitingQueue.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {waitingQueue.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition bg-slate-900/80 hover:bg-slate-850 flex items-center justify-between ${
                    PRIORITY_STYLES[item.prioridade].border
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-white">{item.senha}</span>
                      {item.prioridade !== 'normal' && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            PRIORITY_STYLES[item.prioridade].badge
                          }`}
                        >
                          {QUEUE_PRIORITY_LABEL[item.prioridade]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-200 truncate mt-0.5">
                      {item.pet_nome || item.tutor_nome}
                    </p>
                    <span className="text-xs text-slate-400 block truncate">
                      {services.find((s) => s.id === item.servico_id)?.nome || 'Consulta'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCallNext(item)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition flex-shrink-0"
                    title="Chamar este paciente diretamente"
                  >
                    <Megaphone className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {waitingQueue.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Nenhum paciente aguardando para esta sala.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Transferência */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-brand-400" />
              <span>Transferir Atendimento</span>
            </h3>
            <p className="text-xs text-slate-400">
              Encaminhando a senha <strong className="text-white">{transferTarget.senha}</strong> ({transferTarget.pet_nome || transferTarget.tutor_nome}). O horário original de chegada será mantido na nova fila.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Sala de Destino:
                </label>
                <select
                  value={transferRoom}
                  onChange={(e) => setTransferRoom(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
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
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Motivo da Transferência:
                </label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  rows={2}
                  placeholder="Ex: Encaminhado para exame de imagem ou sala de vacinas"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTransferTarget(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmTransfer}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold hover:bg-brand-500"
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
