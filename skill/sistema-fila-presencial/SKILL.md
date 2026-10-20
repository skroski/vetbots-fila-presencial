---
name: sistema-fila-presencial
description: Sistema de Fila Presencial Veterinária (Node + SQLite, 100% local, sem Supabase e sem internet). Recepção e triagem, telão de TV com playlist de vídeos MP4 e sinal sonoro, chamador de consultório, totem touch com impressão térmica e métricas. Cores e logotipo personalizáveis em tela. Use para instalar o pacote em uma clínica, personalizar (cores, logo, vídeos, salas, serviços), subir na rede local (LAN/Docker), fazer backup, ou evoluir o sistema. Compatível com Claude Code, Codex, Antigravity e Gemini CLI.
---

# Sistema de Fila Presencial Veterinária (Node + SQLite, rede local)

Pacote completo e independente de gestão de atendimento presencial para clínicas e hospitais veterinários.
**Um programa só**: servidor Node + banco SQLite (um arquivo) + interface React já embutida. Roda na rede local
da clínica, sem internet, sem conta em nuvem e sem servidor de banco.

Repositório oficial do pacote: https://github.com/skroski/vetbots-fila-presencial

`$SKILL` = pasta desta skill (`~/.claude/skills/sistema-fila-presencial/`, `~/.agents/skills/...`, `~/.gemini/config/skills/...`).

---

## Estrutura da skill

| Componente | Local | O que é |
| :--- | :--- | :--- |
| **Aplicativo completo** | `assets/app/` | Código pronto para instalar: `server/` (API + SQLite + SSE + uploads), `web/` (React/Vite/Tailwind), `shared/`, Docker, scripts de início, `docs/instalacao.html`. |
| **Criador de projeto** | `scripts/criar-projeto.mjs` | Copia `assets/app/` para uma pasta nova (e instala/inicia se pedido). |
| **Instalador multi-agente** | `scripts/install.mjs` | Instala esta skill em Claude Code, Codex, Gemini/Antigravity. |
| **Instalação passo a passo** | `references/instalacao.md` | Windows, macOS, Linux, Docker, início automático, atualização, restauração. |
| **Arquitetura e telas** | `references/arquitetura-e-telas.md` | As 6 telas, fluxo e regras. |
| **Banco e API** | `references/banco-sqlite-e-api.md` | Tabelas SQLite, regras de senha/prioridade, endpoints REST, tempo real (SSE). |
| **Personalização** | `references/personalizacao.md` | Cores, logotipo, vídeos MP4 da TV, layouts, codecs, PIN dos Ajustes. |
| **Rede local** | `references/rede-local-lan.md` | IP fixo, firewall, Smart TVs, tablets, consultórios. |
| **Totem e impressão** | `references/totem-e-impressao.md` | Kiosk, impressão térmica 58/80 mm silenciosa. |
| **Possibilidades** | `references/possibilidades.md` | O que dá para evoluir (e o que mudou em relação à versão Supabase). |
| **Agentes de IA** | `references/agentes.md` | Como cada agente usa esta skill. |

---

## O que o sistema entrega

1. **Recepção & Triagem (`/`)**: emissão de senhas por serviço (A Consulta, B Retorno, C Vacina, E Exames, X Emergência...), prioridades Normal / Preferencial (Lei 10.048) / Emergência, quadro de status, transferência de sala/serviço sem perder o horário de chegada, impressão térmica.
2. **Telão da TV (`/tv`)**: senha gigante, sinal sonoro de 2 tons (Web Audio, sem MP3), modo privacidade (LGPD), últimas chamadas e próximos. **Playlist de vídeos MP4 em loop**, em dois layouts: *vídeo + painel* ou *vídeo em tela cheia* (a chamada assume a tela por alguns segundos).
3. **Chamador do consultório (`/chamar`, `/chamar/<id-da-sala>`)**: "Chamar Próximo" atômico (Emergência > Preferencial > Normal, depois chegada), repetir chamada, iniciar, finalizar, não compareceu, retornar à fila, transferir.
4. **Totem (`/totem`)**: autoatendimento touch com impressão da senha e retorno automático.
5. **Métricas (`/metricas`)**: TME, TMA, volume por serviço, taxa de ausência (hoje, 7 e 30 dias).
6. **Ajustes (`/config`)**: cor da marca (paleta gerada automaticamente), logotipo, nome/subtítulo, vídeos da TV, salas, serviços/prefixos, cupom (58/80 mm, rodapé, logo), numeração diária, endereços das telas e backup. PIN opcional (`ADMIN_PIN`).

Tempo real por **SSE** (`/api/events`) com polling de 10 s como rede de segurança (Wi-Fi instável).

---

## Como usar esta skill (fluxo do agente)

### A) Instalar em uma clínica / criar o projeto
1. Descubra a pasta destino (pergunte só se não houver como deduzir).
2. Rode:
   ```bash
   node "$SKILL/scripts/criar-projeto.mjs" <pasta-destino> --install
   ```
   Isso copia `assets/app/`, roda `npm install` (que também gera a interface) e deixa pronto para `npm start`.
3. Inicie: `cd <pasta> && npm start` (ou `docker compose up -d --build`). O terminal imprime os endereços de cada tela com o IP da rede.
4. Abra `http://IP:3000/config` e personalize: nome, **cor**, **logotipo**, **vídeos MP4**, salas e serviços.
5. Entregue ao usuário os endereços (TV, recepção, consultórios, totem) e a página `docs/instalacao.html`.

Requisitos: **Node.js 22.16 ou superior** (ou Docker). Nada mais: o SQLite vem embutido no próprio Node (`node:sqlite`), então não há módulo nativo para compilar nem binário para baixar (importante no Windows de clínica, sem Python/Visual Studio).

### B) Atualizar o código de um projeto já instalado
Rode `criar-projeto.mjs <pasta> --atualizar`: sobrescreve apenas o código (`server/`, `web/`, `shared/`, scripts, Docker), **preservando `data/`** (banco, logotipo, vídeos) e `.env`. Depois `npm install && npm start`.

### C) Evoluir o sistema
- Regras da fila: `server/queue.js` (porte das antigas RPCs do Postgres). Senhas são geradas dentro de transação `IMMEDIATE` (`transacao(fn, { imediata: true })` em `server/db.js`) + índice único `(ciclo, senha)`.
- Rotas: `server/app.js`. Configurações editáveis: `server/config.js` (adicione a chave no `SCHEMA` e use em `web/src/types/queue.ts`).
- Nova coluna/tabela: **acrescente** um item ao fim de `MIGRATIONS` em `server/db.js` (nunca edite os anteriores; a versão fica em `PRAGMA user_version`).
- Telas: `web/src/pages/`. Cores sempre por `brand-*` (nunca `emerald-*`): vêm da cor escolhida em `/config`.
- Teste: `npm test` (15 testes de API: concorrência de senhas, fluxo completo, Range 206, SSE, PIN, backup). `npm run dev` roda API + Vite com recarga.

---

## Decisões importantes (não desfazer sem avisar o usuário)

- **SQLite em vez de Supabase**: sem nuvem e sem Postgres. Dados em `data/fila.db` (WAL). Backup: copiar a pasta `data/` ou botão em Ajustes; o servidor também gera backup diário automático em `data/backups/`.
- **Rede local apenas**: não há login de usuário. Quem está na rede abre as telas. Os Ajustes podem ter PIN (`ADMIN_PIN`). **Não exponha a porta na internet.**
- **Numeração reinicia todo dia** (configurável em Ajustes). O "dia" é o do fuso do computador servidor (no Docker, `TZ`, padrão `America/Sao_Paulo`).
- **Vídeos**: MP4 H.264 + AAC é o formato seguro para Smart TVs. Ficam em `data/uploads/videos` e são servidos com HTTP Range (necessário em TVs e Safari).
- Tudo em português do Brasil; interface sem dependência de internet (fontes e ícones embutidos no build).

## Verificação mínima antes de entregar
`npm test` verde → `npm run build` ok → `npm start` → abrir `/`, `/tv`, `/chamar`, `/totem`, `/config` → emitir uma senha, chamar no consultório e ver a TV tocar/pulsar → subir um MP4 em Ajustes → trocar a cor e ver todas as telas mudarem.
