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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div>
            <h1 className="text-lg font-bold text-white">Métricas de Fila e Atendimento</h1>
            <p className="text-xs text-slate-400">Tempo Médio de Espera, Atendimento e Volumes</p>
          </div>
        </div>

        {/* Seletor de Período */}
        <div className="flex gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: 'today', label: 'Hoje' },
            { id: '7d', label: 'Últimos 7 dias' },
            { id: '30d', label: 'Últimos 30 dias' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                period === p.id
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Cartões Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-400" />
              Tempo Médio de Espera (TME)
            </span>
            <div className="text-3xl font-black text-white mt-2">
              {formatMinutes(metrics.avgWait)}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">Da chegada até ser chamado</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-2">
              <Timer className="h-4 w-4 text-blue-400" />
              Tempo Médio de Atendimento (TMA)
            </span>
            <div className="text-3xl font-black text-white mt-2">
              {formatMinutes(metrics.avgService)}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">Duração média da consulta</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              Total de Pacientes Triados
            </span>
            <div className="text-3xl font-black text-white mt-2">{metrics.total}</div>
            <span className="text-xs text-slate-500 mt-1 block">
              {metrics.finalizados} atendidos com sucesso
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-2">
              <UserX className="h-4 w-4 text-rose-400" />
              Taxa de Ausência
            </span>
            <div className="text-3xl font-black text-rose-400 mt-2">{metrics.taxaAusencia}%</div>
            <span className="text-xs text-slate-500 mt-1 block">
              {metrics.ausentes} não compareceram
            </span>
          </div>
        </div>

        {/* Distribuição por Especialidade / Serviço */}
        <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand-400" />
            <span>Volume de Atendimentos por Serviço</span>
          </h2>

          <div className="space-y-4">
            {services.map((srv) => {
              const count = metrics.byService[srv.id] || 0;
              const percent = metrics.total > 0 ? ((count / metrics.total) * 100).toFixed(0) : 0;

              return (
                <div key={srv.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      [{srv.prefixo}] {srv.nome}
                    </span>
                    <span className="text-slate-400">
                      {count} ({percent}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
