# Banco SQLite e API

Substitui o antigo Supabase/Postgres (tabelas `fila_*`, RPCs `adicionar_item_fila`, `alterar_status_fila`, `sala_chamar_fila`, `advisory lock`, RLS e Realtime). Agora é **um arquivo**: `data/fila.db`.

## Por que SQLite
- Zero instalação e zero manutenção: usa o módulo **`node:sqlite`, embutido no Node** (22.16+). Não há pacote nativo no `npm install`, então nada falha por falta de Python/compilador. Observação: no Node 22 o módulo ainda é marcado como experimental (o aviso é silenciado em `server/silenciar-aviso.js`); no Node 24 já não avisa. Os testes (`npm test`) cobrem tudo que o sistema usa dele.
- Rápido de sobra para uma clínica (centenas de senhas por dia).
- Backup é copiar um arquivo. Modo WAL: telas leem enquanto o chamador escreve.
- Limite consciente: **um servidor por clínica**. Para várias unidades sincronizadas na nuvem seria preciso outro desenho (ver `possibilidades.md`).

## Tabelas (`server/db.js`)

| Tabela | Conteúdo |
| :--- | :--- |
| `fila_servicos` | `id, nome (único), prefixo (A-Z, 1-2 letras), ativo, ordem` |
| `fila_salas` | `id, nome (único), ativa` |
| `fila_itens` | Cada senha: `senha, ciclo, servico_id, sala_id, tutor_nome, pet_nome, veterinario_nome, prioridade, status, motivo_resumido, chegada_em, chamado_em, iniciado_em, finalizado_em, ausente_em, cancelado_em, historico_transferencias (JSON)` |
| `fila_chamadas` | Um registro por chamada (inclui "repetir chamada") |
| `config` | Chave/valor: nome, subtítulo, cor, logo, opções da TV e do cupom |
| `midias` | Playlist da TV: `nome, arquivo, tamanho, ordem, ativo` |

Convenções:
- IDs são UUID em texto. **Datas são texto ISO-8601 UTC com `Z`**, geradas em JavaScript (nunca `CURRENT_TIMESTAMP`: sem o `Z` o Safari e as Smart TVs interpretam errado e as métricas quebram).
- Booleanos são 0/1 no banco e viram `true/false` na API.
- Valores: `prioridade` ∈ `normal | prioridade | emergencia`; `status` ∈ `aguardando | chamado | em_atendimento | finalizado | ausente | cancelado`.
- **Migrações**: lista `MIGRATIONS` em `server/db.js`; a versão atual fica em `PRAGMA user_version`. Para mudar o esquema, **acrescente** um item ao final.

## Regras da fila (`server/queue.js`)

- **Senha**: `PREFIXO + número com 3 dígitos` (`A001`). O número é o maior do prefixo no *ciclo* + 1. Ciclo = dia local (numeração reinicia todo dia) ou `continuo` (Ajustes → Sistema). Tudo roda em transação `IMMEDIATE` e há índice único `(ciclo, senha)`: nunca sai senha repetida.
- **Ordem de chamada**: Emergência → Preferencial → Normal; empate por `chegada_em`. Itens com sala definida só aparecem para aquela sala; sem sala aparecem para todas.
- **Chamar próximo** (`POST /api/salas/:id/chamar-proximo`): o servidor escolhe e chama em uma transação. Duas salas clicando juntas nunca chamam o mesmo paciente.
- **Ações** (`POST /api/itens/:id/acao`): `chamar` (grava em `fila_chamadas`; repetir chamada = chamar de novo), `iniciar`, `finalizar`, `ausente`, `retornar` (volta a `aguardando`), `cancelar`, `transferir` (mantém status e horário de chegada; registra origem/destino/motivo no histórico). Itens `finalizado` ou `cancelado` não aceitam mais ações (409).
- `GET /api/state` devolve itens ativos + últimos 30 dias (as métricas usam esse intervalo).

## Endpoints

Públicos (rede local): `GET /api/state`, `GET /api/events` (SSE), `GET /api/config`, `GET /api/info`, `GET /api/health`, `POST /api/itens`, `POST /api/itens/:id/acao`, `POST /api/salas/:id/chamar-proximo`, `GET /midia/<arquivo>`, `GET /marca/<arquivo>`.

Administrativos (exigem o header `x-admin-pin` quando `ADMIN_PIN` está definido): `POST|PATCH|DELETE /api/salas`, `/api/servicos`; `PUT /api/config`; `PUT|DELETE /api/logo`; `PUT /api/midias?nome=` (corpo = arquivo bruto), `PATCH|DELETE /api/midias/:id`, `POST /api/midias/ordem`; `GET /api/backup`.

Erros: JSON `{ "erro": "mensagem legível" }` com status 400/401/404/409/413/415.

## Tempo real

`GET /api/events` (Server-Sent Events) emite `event: changed` após qualquer mudança. As telas respondem com `GET /api/state`. O navegador reconecta sozinho e, além disso, cada tela consulta o servidor a cada 10 s. Não há WebSocket nem biblioteca extra.

## Integrar com outro sistema (ex.: dashboard da clínica)
A API é HTTP simples: um sistema externo pode emitir senhas com `POST /api/itens` (`servicoId`, `tutorNome`, `petNome`, `prioridade`) e ler o estado com `GET /api/state`. Rode só dentro da rede da clínica.

## Migrar dados da versão antiga (Supabase)
Não há migração automática. Para histórico, exporte `fila_itens` do Postgres em CSV e importe com um script `INSERT` (mapeie `uuid`→texto, `timestamptz`→ISO com `Z`, `jsonb`→texto JSON, `ciclo`=dia de `chegada_em`). Para clínicas novas não é necessário.
