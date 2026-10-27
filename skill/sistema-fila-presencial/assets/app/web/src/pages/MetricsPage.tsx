import { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  Users,
  UserX,
  XCircle,
  Timer,
  BarChart3,
  Calendar,
  Building2,
  Tag,
  ArrowLeft,
} from 'lucide-react';
import { useQueueSystem } from '@/hooks/useQueueSystem';

function formatMinutes(mins: number): string {
  if (isNaN(mins) || mins <= 0) return '0 min';
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

export default function MetricsPage() {
  const { items, services, rooms } = useQueueSystem();
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('today');

  const filteredItems = useMemo(() => {
    const now = new Date();
    let cutoff: Date;

    if (period === 'today') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === '7d') {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return items.filter((item) => new Date(item.chegada_em) >= cutoff);
  }, [items, period]);

  const metrics = useMemo(() => {
    const total = filteredItems.length;
    const finalizados = filteredItems.filter((i) => i.status === 'finalizado');
    const ausentes = filteredItems.filter((i) => i.status === 'ausente');
    const cancelados = filteredItems.filter((i) => i.status === 'cancelado');

    // Tempo médio de espera (Chegada até chamado/início)
    const waitTimes: number[] = [];
    filteredItems.forEach((i) => {
      const callOrStart = i.chamado_em || i.iniciado_em;
      if (callOrStart && i.chegada_em) {
        const diffMs = new Date(callOrStart).getTime() - new Date(i.chegada_em).getTime();
        const mins = diffMs / 60000;
        if (mins >= 0 && mins < 1440) waitTimes.push(mins);
      }
    });
    const avgWait = waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0;

    // Tempo médio de atendimento (Início até finalização)
    const serviceTimes: number[] = [];
    finalizados.forEach((i) => {
      const start = i.iniciado_em || i.chamado_em;
      if (start && i.finalizado_em) {
        const diffMs = new Date(i.finalizado_em).getTime() - new Date(start).getTime();
        const mins = diffMs / 60000;
        if (mins >= 0 && mins < 1440) serviceTimes.push(mins);
      }
    });
    const avgService =
      serviceTimes.length > 0 ? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length : 0;

    // Volume por Serviço
    const byService: Record<string, number> = {};
    filteredItems.forEach((i) => {
      byService[i.servico_id] = (byService[i.servico_id] || 0) + 1;
    });

    const taxaAusencia = total > 0 ? ((ausentes.length / total) * 100).toFixed(1) : '0';

    return {
      total,
      finalizados: finalizados.length,
      ausentes: ausentes.length,
      cancelados: cancelados.length,
      avgWait,
      avgService,
      byService,
      taxaAusencia,
    };
  }, [filteredItems]);

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col pb-28">
      <header className="navbar bg-base-200 border-b border-base-300 px-6 py-4 flex-wrap justify-between gap-4">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="btn btn-ghost btn-square" aria-label="Voltar à recepção"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div>
            <h1 className="text-lg font-bold text-base-content">Métricas de Fila e Atendimento</h1>
            <p className="text-xs text-neutral">Tempo Médio de Espera, Atendimento e Volumes</p>
          </div>
        </div>

        {/* Seletor de Período */}
        <div role="tablist" className="tabs tabs-boxed !flex max-w-full flex-wrap">
          {(
            [
              { id: 'today', label: 'Hoje' },
              { id: '7d', label: 'Últimos 7 dias' },
              { id: '30d', label: 'Últimos 30 dias' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              role="tab"
              onClick={() => setPeriod(p.id)}
              className={`tab h-auto whitespace-nowrap py-1.5 ${period === p.id ? 'tab-active' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Cartões Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stats stats-vertical w-full border border-base-300 bg-base-100 shadow-soft">
            <div className="stat">
              <div className="stat-title flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                Tempo Médio de Espera (TME)
              </div>
              <div className="stat-value text-3xl">{formatMinutes(metrics.avgWait)}</div>
              <div className="stat-desc">Da chegada até ser chamado</div>
            </div>
          </div>

          <div className="stats stats-vertical w-full border border-base-300 bg-base-100 shadow-soft">
            <div className="stat">
              <div className="stat-title flex items-center gap-2">
                <Timer className="h-4 w-4 text-info" />
                Tempo Médio de Atendimento (TMA)
              </div>
              <div className="stat-value text-3xl">{formatMinutes(metrics.avgService)}</div>
              <div className="stat-desc">Duração média da consulta</div>
            </div>
          </div>

          <div className="stats stats-vertical w-full border border-base-300 bg-base-100 shadow-soft">
            <div className="stat">
              <div className="stat-title flex items-center gap-2">
                <Users className="h-4 w-4 text-secondary" />
                Total de Pacientes Triados
              </div>
              <div className="stat-value text-3xl">{metrics.total}</div>
              <div className="stat-desc">{metrics.finalizados} atendidos com sucesso</div>
            </div>
          </div>

          <div className="stats stats-vertical w-full border border-base-300 bg-base-100 shadow-soft">
            <div className="stat">
              <div className="stat-title flex items-center gap-2">
                <UserX className="h-4 w-4 text-error" />
                Taxa de Ausência
              </div>
              <div className="stat-value text-3xl text-error">{metrics.taxaAusencia}%</div>
              <div className="stat-desc">{metrics.ausentes} não compareceram</div>
            </div>
          </div>
        </div>

        {/* Distribuição por Especialidade / Serviço */}
        <div className="card bg-base-100 border border-base-300 shadow-soft p-6">
          <h2 className="text-base font-bold text-base-content mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" />
            <span>Volume de Atendimentos por Serviço</span>
          </h2>

          <div className="space-y-4">
            {services.map((srv) => {
              const count = metrics.byService[srv.id] || 0;
              const percent = metrics.total > 0 ? ((count / metrics.total) * 100).toFixed(0) : 0;

              return (
                <div key={srv.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-base-content">
                      [{srv.prefixo}] {srv.nome}
                    </span>
                    <span className="text-neutral">
                      {count} ({percent}%)
                    </span>
                  </div>
                  <progress className="progress progress-primary w-full" value={Number(percent)} max={100} />
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
