import { useCallback } from 'react';
import { api } from '@/lib/api';
import { refresh, useStore } from '@/lib/store';
import type { QueueItem, QueuePriority } from '@/types/queue';

export type AcaoFila = 'chamar' | 'iniciar' | 'finalizar' | 'ausente' | 'retornar' | 'cancelar' | 'transferir';

/** Fila em tempo real (servidor local + SQLite). Todas as telas usam este hook. */
export function useQueueSystem() {
  const { services, rooms, veterinarios, items, midias, config, loaded, online } = useStore();

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

  const editarItem = useCallback(
    async (
      itemId: string,
      params: Partial<{
        servicoId: string;
        tutorNome: string;
        petNome: string;
        veterinarioNome: string;
        prioridade: QueuePriority;
        motivoResumido: string;
        salaId: string | null;
      }>,
    ) => {
      const atualizado = await api<QueueItem>('PATCH', `/api/itens/${itemId}`, params);
      void refresh();
      return atualizado;
    },
    [],
  );

  const alterarStatus = useCallback(
    async (
      itemId: string,
      acao: AcaoFila,
      extra?: { salaId?: string; novoServicoId?: string; motivo?: string; veterinarioNome?: string },
    ) => {
      await api('POST', `/api/itens/${itemId}/acao`, { acao, ...extra });
      void refresh();
    },
    [],
  );

  /** "Chamar Próximo": o servidor escolhe (Emergência > Preferencial > Normal) de forma atômica. */
  const chamarProximo = useCallback(async (salaId: string, extra?: { veterinarioNome?: string }) => {
    const item = await api<QueueItem>('POST', `/api/salas/${salaId}/chamar-proximo`, extra);
    void refresh();
    return item;
  }, []);

  return {
    services,
    rooms,
    veterinarios,
    items,
    midias,
    config,
    loading: !loaded,
    online,
    fetchAll: refresh,
    adicionarItem,
    editarItem,
    alterarStatus,
    chamarProximo,
  };
}
