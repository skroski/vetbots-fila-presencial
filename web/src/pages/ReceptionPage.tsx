import { useState, useMemo } from 'react';
import {
  ArrowRightLeft,
  DoorOpen,
  Megaphone,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Search,
  Stethoscope,
  Touchpad,
  Tv,
} from 'lucide-react';
import { useQueueSystem } from '@/hooks/useQueueSystem';
import { agoraServidor } from '@/lib/store';
import { qrCodeParaSvg } from '@/lib/qrcode';
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
  const { services, rooms, veterinarios, items, config, adicionarItem, editarItem, alterarStatus } = useQueueSystem();

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

  // Modal de Edição de Informações
  const [editTarget, setEditTarget] = useState<QueueItem | null>(null);
  const [editTutor, setEditTutor] = useState('');
  const [editPet, setEditPet] = useState('');
  const [editVet, setEditVet] = useState('');
  const [editPriority, setEditPriority] = useState<QueuePriority>('normal');
  const [editMotivo, setEditMotivo] = useState('');

  // Modal de Conexão Rápida / QR Code para Telão e Totem
  const [qrModal, setQrModal] = useState<{ nome: string; rota: string } | null>(null);
  const [editServiceId, setEditServiceId] = useState('');
  const [editRoomId, setEditRoomId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Métricas rápidas no topo
  const stats = useMemo(() => {
    const inicioDoDia = new Date(agoraServidor());
    inicioDoDia.setHours(0, 0, 0, 0);
    return {
      aguardando: items.filter((i) => i.status === 'aguardando').length,
      chamados: items.filter((i) => i.status === 'chamado').length,
      emAtendimento: items.filter((i) => i.status === 'em_atendimento').length,
      // `items` traz até 30 dias de histórico: "hoje" conta só o que terminou desde a meia-noite local
      finalizados: items.filter(
        (i) => i.status === 'finalizado' && i.finalizado_em && new Date(i.finalizado_em) >= inicioDoDia,
      ).length,
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
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col pb-28">
      {/* Barra Superior */}
      <header className="navbar bg-base-200 border-b border-base-300 px-6 py-4 flex-wrap justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandMark size="sm" />
          {config.show_brand_text ? (
            <div>
              <h1 className="text-lg font-bold text-base-content leading-tight">{config.clinic_name}</h1>
              <span className="text-xs text-neutral">Recepção &amp; Triagem · {config.clinic_subtitle}</span>
            </div>
          ) : (
            <h1 className="sr-only">Recepção &amp; Triagem</h1>
          )}
        </div>

        {/* Links rápidos para Telão TV e Chamador */}
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/tv"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-primary"
          >
            <Tv className="h-4 w-4" />
            <span>Abrir Telão da TV</span>
          </a>

          <a
            href="/totem"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-primary"
          >
            <Touchpad className="h-4 w-4" />
            <span>Totem Touch</span>
          </a>

          <a
            href="/chamar"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-primary"
          >
            <DoorOpen className="h-4 w-4" />
            <span>Chamador de Consultório</span>
          </a>

          <button
            onClick={() => setQrModal({ nome: 'Conectar Telão ou Tablet', rota: '/tv' })}
            className="btn btn-outline btn-primary gap-2"
            title="Conectar Smart TVs, tablets ou outros computadores na rede da clínica"
          >
            <QrCode className="h-4 w-4" />
            <span>Conectar TV / Tablet</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Senha</span>
          </button>
        </div>
      </header>

      {/* Modal Conectar TV / Tablet com QR Code */}
      {qrModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md p-6 space-y-5 text-center">
            <h3 className="text-lg font-bold text-base-content">Conectar Aparelho na Clínica</h3>
            <p className="text-xs text-neutral">
              Aponte a câmera do celular, tablet ou o leitor da TV para abrir sem digitar nenhum endereço:
            </p>

            <div className="flex justify-center gap-2">
              <button
                className={`btn btn-sm ${qrModal.rota === '/tv' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setQrModal({ nome: 'Telão da TV', rota: '/tv' })}
              >
                <Tv className="h-4 w-4" /> Telão TV
              </button>
              <button
                className={`btn btn-sm ${qrModal.rota === '/totem' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setQrModal({ nome: 'Totem Touch', rota: '/totem' })}
              >
                <Touchpad className="h-4 w-4" /> Totem
              </button>
              <button
                className={`btn btn-sm ${qrModal.rota === '/chamar' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setQrModal({ nome: 'Chamador de Consultório', rota: '/chamar' })}
              >
                <DoorOpen className="h-4 w-4" /> Consultório
              </button>
            </div>

            <div
              className="mx-auto flex items-center justify-center p-3 bg-white rounded-xl shadow-inner border border-base-300 w-fit"
              dangerouslySetInnerHTML={{
                __html: qrCodeParaSvg(`${window.location.origin}${qrModal.rota}`, 220),
              }}
            />

            <div className="bg-base-200 rounded-lg p-3 text-left space-y-1">
              <div className="text-[11px] font-semibold text-neutral">Ou digite no navegador do aparelho:</div>
              <code className="font-mono text-xs text-accent break-all select-all block">
                {window.location.origin}{qrModal.rota}
              </code>
            </div>

            <div className="modal-action justify-center">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  navigator.clipboard
                    ?.writeText(`${window.location.origin}${qrModal.rota}`)
                    .then(() => toast.success('Link copiado.'))
                }
              >
                Copiar link
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setQrModal(null)}>
                Fechar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setQrModal(null)} />
        </div>
      )}

      {/* Cartões de Indicadores Rápidos */}
      <div className="max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stats stats-vertical w-full border border-base-300 bg-base-100 shadow-soft">
            <div className="stat">
              <div className="stat-title">Aguardando no Saguão</div>
              <div className="stat-value text-3xl text-warning">{stats.aguardando}</div>
            </div>
          </div>

          <div className="stats stats-vertical w-full border border-base-300 bg-base-100 shadow-soft">
            <div className="stat">
              <div className="stat-title">Chamados na TV</div>
              <div className="stat-value text-3xl text-accent">{stats.chamados}</div>
            </div>
          </div>

          <div className="stats stats-vertical w-full border border-base-300 bg-base-100 shadow-soft">
            <div className="stat">
              <div className="stat-title">Em Consulta</div>
              <div className="stat-value text-3xl text-info">{stats.emAtendimento}</div>
            </div>
          </div>

          <div className="stats stats-vertical w-full border border-base-300 bg-base-100 shadow-soft">
            <div className="stat">
              <div className="stat-title">Atendidos Hoje</div>
              <div className="stat-value text-3xl text-base-content/80">{stats.finalizados}</div>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="card bg-base-100 border border-base-300 shadow-soft p-4 flex-row flex-wrap items-center justify-between gap-4">
          <div role="tablist" className="tabs tabs-boxed !flex max-w-full flex-wrap">
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
                role="tab"
                onClick={() => setStatusFilter(tab.id)}
                className={`tab h-auto whitespace-nowrap py-1.5 ${statusFilter === tab.id ? 'tab-active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <label className="input input-bordered flex w-full max-w-xs items-center gap-2">
            <Search className="h-4 w-4 text-neutral" />
            <input
              type="text"
              placeholder="Buscar por senha, tutor ou pet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="grow"
            />
          </label>
        </div>

        {/* Tabela de Senhas / Pacientes */}
        <div className="card bg-base-100 border border-base-300 overflow-x-auto shadow-soft">
          <table className="table">
            <thead>
              <tr className="bg-base-200 text-neutral">
                <th className="py-3 px-4">Senha</th>
                <th className="py-3 px-4">Tutor & Pet</th>
                <th className="py-3 px-4">Serviço</th>
                <th className="py-3 px-4">Prioridade</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Sala</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredItems.map((item) => {
                const srv = services.find((s) => s.id === item.servico_id);
                const rm = rooms.find((r) => r.id === item.sala_id);

                return (
                  <tr key={item.id} className="hover">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-black text-lg text-base-content">{item.senha}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-base-content">
                        {item.pet_nome ? `${item.pet_nome} 🐾` : '—'}
                      </div>
                      <span className="text-xs text-neutral">{item.tutor_nome}</span>
                      {item.veterinario_nome && (
                        <div className="text-xs text-primary font-medium flex items-center gap-1 mt-0.5">
                          <Stethoscope className="h-3 w-3" />
                          <span>{item.veterinario_nome}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-base-content/80">
                      {srv?.nome || 'Geral'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`${PRIORITY_STYLES[item.prioridade].badge} badge-sm font-semibold`}>
                        {QUEUE_PRIORITY_LABEL[item.prioridade]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`badge font-semibold ${
                          item.status === 'chamado'
                            ? 'badge-soft-warning'
                            : item.status === 'em_atendimento'
                            ? 'badge-soft-primary'
                            : item.status === 'finalizado'
                            ? 'badge-soft-neutral text-neutral'
                            : 'badge-soft-neutral'
                        }`}
                      >
                        {QUEUE_STATUS_LABEL[item.status]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-base-content/80">
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
                            className="btn btn-primary btn-square btn-sm"
                            title="Chamar no Telão"
                          >
                            <Megaphone className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setEditTarget(item);
                            setEditTutor(item.tutor_nome);
                            setEditPet(item.pet_nome || '');
                            setEditVet(item.veterinario_nome || '');
                            setEditPriority(item.prioridade);
                            setEditMotivo(item.motivo_resumido || '');
                            setEditServiceId(item.servico_id);
                            setEditRoomId(item.sala_id || '');
                          }}
                          className="btn btn-ghost btn-square btn-sm"
                          title="Editar Dados da Senha"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => {
                            setTransferTarget(item);
                            setTargetRoom(item.sala_id || '');
                            setTargetService(item.servico_id || '');
                          }}
                          className="btn btn-ghost btn-square btn-sm"
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
                          className="btn btn-ghost btn-square btn-sm"
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
                  <td colSpan={7} className="py-8 text-center text-neutral text-xs">
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
        <div className="modal modal-open">
          <form onSubmit={handleCreateTicket} className="modal-box max-w-lg space-y-4 p-8">
            <div className="flex items-center justify-between border-b border-base-300 pb-3">
              <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
                <Plus className="h-5 w-5 text-accent" />
                <span>Emitir Nova Senha de Atendimento</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="label-text mb-1 block font-semibold">
                  Tipo de Serviço / Fila *
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="select select-bordered w-full"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.prefixo}] {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-text mb-1 block font-semibold">
                  Prioridade do Atendimento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'prioridade', 'emergencia'] as QueuePriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`btn btn-sm ${
                        priority === p
                          ? p === 'emergencia'
                            ? 'btn-error'
                            : p === 'prioridade'
                            ? 'btn-warning'
                            : 'btn-primary'
                          : 'btn-ghost border-base-300'
                      }`}
                    >
                      {p === 'emergencia' ? 'Emergência' : p === 'prioridade' ? 'Preferencial' : 'Normal'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label-text mb-1 block font-semibold">
                    Nome do Tutor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Alberto"
                    value={tutorName}
                    onChange={(e) => setTutorName(e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>

                <div>
                  <label className="label-text mb-1 block font-semibold">
                    Nome do Pet
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Thor"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              <div>
                <label className="label-text mb-1 block font-semibold">
                  Veterinário / Profissional Responsável (Opcional)
                </label>
                <div className="flex gap-2">
                  <select
                    value={veterinarianName}
                    onChange={(e) => setVeterinarianName(e.target.value)}
                    className="select select-bordered flex-1"
                  >
                    <option value="">Não definido (Fila do consultório)</option>
                    {veterinarios.filter((v) => v.ativo).map((v) => (
                      <option key={v.id} value={v.nome}>
                        {v.nome} {v.crmv ? `(${v.crmv})` : ''}
                      </option>
                    ))}
                  </select>
                  {veterinarios.length === 0 && (
                    <input
                      type="text"
                      placeholder="Ou digite o nome do profissional"
                      value={veterinarianName}
                      onChange={(e) => setVeterinarianName(e.target.value)}
                      className="input input-bordered flex-1"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="label-text mb-1 block font-semibold">
                  Motivo Resumido (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Vômito há 2 dias, vacina anual, retorno de cirurgia"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>

              <div>
                <label className="label-text mb-1 block font-semibold">
                  Direcionar para Sala Específica (Opcional)
                </label>
                <select
                  value={initialRoomId}
                  onChange={(e) => setInitialRoomId(e.target.value)}
                  className="select select-bordered w-full"
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

            <div className="flex justify-end gap-2 pt-3 border-t border-base-300">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Gerar Senha e Imprimir
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Transferência */}
      {transferTarget && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md space-y-4 p-8">
            <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-accent" />
              <span>Transferir Atendimento</span>
            </h3>
            <p className="text-xs text-neutral">
              Transferindo senha <strong className="text-base-content">{transferTarget.senha}</strong> ({transferTarget.pet_nome || transferTarget.tutor_nome}). O tempo original de chegada é mantido.
            </p>

            <div className="space-y-3">
              <div>
                <label className="label-text mb-1 block font-semibold">
                  Nova Sala / Consultório:
                </label>
                <select
                  value={targetRoom}
                  onChange={(e) => setTargetRoom(e.target.value)}
                  className="select select-bordered w-full"
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
                <label className="label-text mb-1 block font-semibold">
                  Novo Serviço / Tipo de Fila:
                </label>
                <select
                  value={targetService}
                  onChange={(e) => setTargetService(e.target.value)}
                  className="select select-bordered w-full"
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
                <label className="label-text mb-1 block font-semibold">
                  Motivo da Transferência:
                </label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  rows={2}
                  placeholder="Ex: Encaminhado para exame de raio-x ou procedimento"
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

      {/* Modal de Edição de Informações */}
      {editTarget && (
        <div className="modal modal-open">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editTutor.trim()) return;
              setSavingEdit(true);
              try {
                await editarItem(editTarget.id, {
                  tutorNome: editTutor.trim(),
                  petNome: editPet.trim() || undefined,
                  veterinarioNome: editVet.trim() || undefined,
                  prioridade: editPriority,
                  motivoResumido: editMotivo.trim() || undefined,
                  servicoId: editServiceId,
                  salaId: editRoomId || null,
                });
                toast.success(`Senha ${editTarget.senha} atualizada!`);
                setEditTarget(null);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Erro ao salvar alterações.');
              } finally {
                setSavingEdit(false);
              }
            }}
            className="modal-box max-w-lg space-y-4 p-8"
          >
            <div className="flex items-center justify-between border-b border-base-300 pb-3">
              <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
                <Pencil className="h-5 w-5 text-accent" />
                <span>Editar Dados: Senha {editTarget.senha}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="label-text mb-1 block font-semibold">Tipo de Serviço / Fila</label>
                <select
                  value={editServiceId}
                  onChange={(e) => setEditServiceId(e.target.value)}
                  className="select select-bordered w-full"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.prefixo}] {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-text mb-1 block font-semibold">Prioridade</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'prioridade', 'emergencia'] as QueuePriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditPriority(p)}
                      className={`btn btn-sm ${
                        editPriority === p
                          ? p === 'emergencia'
                            ? 'btn-error'
                            : p === 'prioridade'
                            ? 'btn-warning'
                            : 'btn-primary'
                          : 'btn-ghost border-base-300'
                      }`}
                    >
                      {p === 'emergencia' ? 'Emergência' : p === 'prioridade' ? 'Preferencial' : 'Normal'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label-text mb-1 block font-semibold">Nome do Tutor *</label>
                  <input
                    type="text"
                    required
                    value={editTutor}
                    onChange={(e) => setEditTutor(e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>
                <div>
                  <label className="label-text mb-1 block font-semibold">Nome do Pet</label>
                  <input
                    type="text"
                    value={editPet}
                    onChange={(e) => setEditPet(e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              <div>
                <label className="label-text mb-1 block font-semibold">Veterinário / Profissional Responsável</label>
                <div className="flex gap-2">
                  <select
                    value={editVet}
                    onChange={(e) => setEditVet(e.target.value)}
                    className="select select-bordered flex-1"
                  >
                    <option value="">Não definido (Fila do consultório)</option>
                    {veterinarios.map((v) => (
                      <option key={v.id} value={v.nome}>
                        {v.nome} {v.crmv ? `(${v.crmv})` : ''} {!v.ativo ? '(Inativo)' : ''}
                      </option>
                    ))}
                    {editVet && !veterinarios.some((v) => v.nome === editVet) && (
                      <option value={editVet}>{editVet} (Personalizado)</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="label-text mb-1 block font-semibold">Direcionar para Sala / Consultório</label>
                <select
                  value={editRoomId}
                  onChange={(e) => setEditRoomId(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="">Fila Geral (Qualquer consultório disponível)</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-text mb-1 block font-semibold">Motivo Resumido</label>
                <input
                  type="text"
                  value={editMotivo}
                  onChange={(e) => setEditMotivo(e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-base-300">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="btn btn-ghost"
                disabled={savingEdit}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingEdit}
              >
                {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
