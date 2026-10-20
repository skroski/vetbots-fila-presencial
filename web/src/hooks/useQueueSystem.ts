import { useCallback } from 'react';
import { api } from '@/lib/api';
import { refresh, useStore } from '@/lib/store';
import type { QueueItem, QueuePriority } from '@/types/queue';

export type AcaoFila = 'chamar' | 'iniciar' | 'finalizar' | 'ausente' | 'retornar' | 'cancelar' | 'transferir';

/** Fila em tempo real (servidor local + SQLite). Todas as telas usam este hook. */
export function useQueueSystem() {
  const { services, rooms, items, midias, config, loaded, online } = useStore();

  const adicionarItem = useCallback(
    async (params: {
      servicoId: string;
      tutorNome: string;
      petNome?: string;
      veterinarioNome?: string;
      prioridade: QueuePriority;
      motivoResumido?: string;
      salaId?: string;
    }) => {
      const novo = await api<QueueItem>('POST', '/api/itens', params);
      void refresh();
      return novo;
    },
    [],
  );

  const alterarStatus = useCallback(
    async (itemId: string, acao: AcaoFila, extra?: { salaId?: string; novoServicoId?: string; motivo?: string }) => {
      await api('POST', `/api/itens/${itemId}/acao`, { acao, ...extra });
      void refresh();
    },
    [],
  );

  /** "Chamar Próximo": o servidor escolhe (Emergência > Preferencial > Normal) de forma atômica. */
  const chamarProximo = useCallback(async (salaId: string) => {
    const item = await api<QueueItem>('POST', `/api/salas/${salaId}/chamar-proximo`);
    void refresh();
    return item;
  }, []);

  return {
    services,
    rooms,
    items,
    midias,
    config,
    loading: !loaded,
    online,
    fetchAll: refresh,
    adicionarItem,
    alterarStatus,
    chamarProximo,
  };
}
