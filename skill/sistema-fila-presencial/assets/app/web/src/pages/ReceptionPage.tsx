import { useState, useMemo } from 'react';
import {
  Plus,
  Tv,
  Megaphone,
  UserCheck,
  CheckCircle2,
  Clock,
  Printer,
  ArrowRightLeft,
  UserX,
  XCircle,
  Search,
  Filter,
  DoorOpen,
  Volume2,
} from 'lucide-react';
import { useQueueSystem } from '@/hooks/useQueueSystem';
import {
  QUEUE_PRIORITY_LABEL,
  QUEUE_STATUS_LABEL,
  PRIORITY_STYLES,
  type QueueItem,
  type QueuePriority,
  type QueueStatus,
} from '@/types/queue';
import { imprimirSenhaTermica, opcoesTicket } from '@/lib/printer';
import BrandMark from '@/components/BrandMark';
import { toast } from 'sonner';
import { tocarChimeFila } from '@/lib/audioChime';

export default function ReceptionPage() {
  const { services, rooms, items, config, adicionarItem, alterarStatus } = useQueueSystem();

  // Estados de filtro e busca
  const [statusFilter, setStatusFilter] = useState<string>('todos_ativos');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de Emissão de Senha
  const [showAddModal, setShowAddModal] = useState(false);
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [tutorName, setTutorName] = useState('');
  const [petName, setPetName] = useState('');
  const [veterinarianName, setVeterinarianName] = useState('');
  const [priority, setPriority] = useState<QueuePriority>('normal');
  const [motivo, setMotivo] = useState('');
  const [initialRoomId, setInitialRoomId] = useState('');

  // Modal de Transferência
  const [transferTarget, setTransferTarget] = useState<QueueItem | null>(null);
  const [targetRoom, setTargetRoom] = useState('');
  const [targetService, setTargetService] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Métricas rápidas no topo
  const stats = useMemo(() => {
    return {
      aguardando: items.filter((i) => i.status === 'aguardando').length,
      chamados: items.filter((i) => i.status === 'chamado').length,
      emAtendimento: items.filter((i) => i.status === 'em_atendimento').length,
      finalizados: items.filter((i) => i.status === 'finalizado').length,
      total: items.length,
    };
  }, [items]);

  // Lista filtrada
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro de status
      if (statusFilter === 'todos_ativos') {
        if (!['aguardando', 'chamado', 'em_atendimento'].includes(item.status)) return false;
      } else if (statusFilter !== 'todos') {
        if (item.status !== statusFilter) return false;
      }

      // Filtro de busca
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesSenha = item.senha.toLowerCase().includes(q);
        const matchesTutor = item.tutor_nome.toLowerCase().includes(q);
        const matchesPet = item.pet_nome?.toLowerCase().includes(q);
        if (!matchesSenha && !matchesTutor && !matchesPet) return false;
      }

      return true;
    });
  }, [items, statusFilter, searchTerm]);

  // Submeter nova senha
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorName.trim()) return;

    try {
      const targetSrv = serviceId || services[0]?.id;
      const item = await adicionarItem({
        servicoId: targetSrv,
        tutorNome: tutorName.trim(),
        petNome: petName.trim() || undefined,
        veterinarioNome: veterinarianName.trim() || undefined,
        prioridade: priority,
        motivoResumido: motivo.trim() || undefined,
        salaId: initialRoomId || undefined,
      });

      // Imprime cupom se desejado
      const sName = services.find((s) => s.id === targetSrv)?.nome || 'Atendimento';
      imprimirSenhaTermica({
        ticket: item.senha,
        serviceName: sName,
        tutorName: tutorName.trim(),
        petName: petName.trim() || null,
        priority: QUEUE_PRIORITY_LABEL[priority],
        ...opcoesTicket(config),
      });

      setShowAddModal(false);
      setTutorName('');
      setPetName('');
      setVeterinarianName('');
      setMotivo('');
      setPriority('normal');
      setInitialRoomId('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível emitir a senha.');
    }
  };

  // Confirmar Transferência
  const handleConfirmTransfer = async () => {
    if (!transferTarget) return;
    await alterarStatus(transferTarget.id, 'transferir', {
      salaId: targetRoom || undefined,
      novoServicoId: targetService || undefined,
      motivo: transferReason,
    });
    setTransferTarget(null);
    setTargetRoom('');
    setTargetService('');
    setTransferReason('');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Barra Superior */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandMark size="sm" />
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">{config.clinic_name}</h1>
            <span className="text-xs text-slate-400">Recepção &amp; Triagem · {config.clinic_subtitle}</span>
          </div>
        </div>

        {/* Links rápidos para Telão TV e Chamador */}
        <div className="flex items-center gap-3">
          <a
            href="/tv"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-3 py-2 rounded-lg text-slate-200 transition"
          >
            <Tv className="h-4 w-4 text-brand-400" />
            <span>Abrir Telão da TV</span>
          </a>

          <a
            href="/chamar"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-3 py-2 rounded-lg text-slate-200 transition"
          >
            <DoorOpen className="h-4 w-4 text-brand-400" />
            <span>Chamador de Consultório</span>
          </a>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-brand-900/30 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Senha</span>
          </button>
        </div>
      </header>

      {/* Cartões de Indicadores Rápidos */}
      <div className="max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Aguardando no Saguão
            </span>
            <div className="text-3xl font-black text-amber-400 mt-1">{stats.aguardando}</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Chamados na TV
            </span>
            <div className="text-3xl font-black text-brand-400 mt-1">{stats.chamados}</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Em Consulta
            </span>
            <div className="text-3xl font-black text-blue-400 mt-1">{stats.emAtendimento}</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Atendidos Hoje
            </span>
            <div className="text-3xl font-black text-slate-300 mt-1">{stats.finalizados}</div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'todos_ativos', label: 'Em Andamento' },
              { id: 'aguardando', label: 'Aguardando' },
              { id: 'chamado', label: 'Chamados' },
              { id: 'em_atendimento', label: 'Em Atendimento' },
              { id: 'finalizado', label: 'Finalizados' },
              { id: 'todos', label: 'Todos' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === tab.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[260px]">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por senha, tutor ou pet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Tabela de Senhas / Pacientes */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/60">
                <th className="py-3 px-4">Senha</th>
                <th className="py-3 px-4">Tutor & Pet</th>
                <th className="py-3 px-4">Serviço</th>
                <th className="py-3 px-4">Prioridade</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Sala</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {filteredItems.map((item) => {
                const srv = services.find((s) => s.id === item.servico_id);
                const rm = rooms.find((r) => r.id === item.sala_id);

                return (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-black text-lg text-white">{item.senha}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-100">
                        {item.pet_nome ? `${item.pet_nome} 🐾` : '—'}
                      </div>
                      <span className="text-xs text-slate-400">{item.tutor_nome}</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-300">
                      {srv?.nome || 'Geral'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          PRIORITY_STYLES[item.prioridade].badge
                        }`}
                      >
                        {QUEUE_PRIORITY_LABEL[item.prioridade]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          item.status === 'chamado'
                            ? 'bg-amber-500/20 text-amber-300'
                            : item.status === 'em_atendimento'
                            ? 'bg-brand-500/20 text-brand-300'
                            : item.status === 'finalizado'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        {QUEUE_STATUS_LABEL[item.status]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-300">
                      {rm?.nome || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status === 'aguardando' && (
                          <button
                            onClick={() => {
                              alterarStatus(item.id, 'chamar', { salaId: item.sala_id || rooms.find((r) => r.ativa)?.id });
                              tocarChimeFila();
                            }}
                            className="p-1.5 rounded-lg bg-brand-600/20 text-brand-400 hover:bg-brand-600 hover:text-white transition"
                            title="Chamar no Telão"
                          >
                            <Megaphone className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setTransferTarget(item);
                            setTargetRoom(item.sala_id || '');
                            setTargetService(item.servico_id || '');
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
                          title="Transferir Sala ou Fila"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() =>
                            imprimirSenhaTermica({
                              ticket: item.senha,
                              serviceName: srv?.nome || 'Atendimento',
                              tutorName: item.tutor_nome,
                              petName: item.pet_nome,
                              priority: QUEUE_PRIORITY_LABEL[item.prioridade],
                              ...opcoesTicket(config),
                            })
                          }
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
                          title="Imprimir Cupom Térmico"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Nenhum paciente encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Nova Senha */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTicket}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-brand-400" />
                <span>Emitir Nova Senha de Atendimento</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tipo de Serviço / Fila *
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.prefixo}] {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Prioridade do Atendimento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'prioridade', 'emergencia'] as QueuePriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`text-xs py-2 px-3 rounded-lg font-bold border transition ${
                        priority === p
                          ? p === 'emergencia'
                            ? 'bg-rose-600 text-white border-rose-500'
                            : p === 'prioridade'
                            ? 'bg-amber-600 text-white border-amber-500'
                            : 'bg-brand-600 text-white border-brand-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      {p === 'emergencia' ? 'Emergência' : p === 'prioridade' ? 'Preferencial' : 'Normal'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nome do Tutor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Alberto"
                    value={tutorName}
                    onChange={(e) => setTutorName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nome do Pet
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Thor"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Motivo Resumido (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Vômito há 2 dias, vacina anual, retorno de cirurgia"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Direcionar para Sala Específica (Opcional)
                </label>
                <select
                  value={initialRoomId}
                  onChange={(e) => setInitialRoomId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-white"
                >
                  <option value="">Fila Geral (Qualquer consultório disponível)</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-750"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold shadow-lg shadow-brand-900/30"
              >
                Gerar Senha e Imprimir
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Transferência */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-brand-400" />
              <span>Transferir Atendimento</span>
            </h3>
            <p className="text-xs text-slate-400">
              Transferindo senha <strong className="text-white">{transferTarget.senha}</strong> ({transferTarget.pet_nome || transferTarget.tutor_nome}). O tempo original de chegada é mantido.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nova Sala / Consultório:
                </label>
                <select
                  value={targetRoom}
                  onChange={(e) => setTargetRoom(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                >
                  <option value="">Manter sala atual / Fila geral</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Novo Serviço / Tipo de Fila:
                </label>
                <select
                  value={targetService}
                  onChange={(e) => setTargetService(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                >
                  <option value="">Manter serviço atual</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.prefixo}] {s.nome}
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
                  placeholder="Ex: Encaminhado para exame de raio-x ou procedimento"
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
