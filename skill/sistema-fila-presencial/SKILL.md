---
name: sistema-fila-presencial
description: Sistema de Fila Presencial Veterinária (Node + SQLite, 100% local, sem serviços externos e sem internet). Recepção e triagem, telão de TV com playlist de vídeos MP4 e sinal sonoro, chamador de consultório, totem touch com impressão térmica e métricas. Cores e logotipo personalizáveis em tela. Use quando pedirem para instalar, ligar ou configurar a fila da clínica ("instale a fila", "sistema de senhas", "painel da TV"), para instalar o pacote em uma clínica, personalizar (cores, logo, vídeos, salas, serviços), subir na rede local (LAN/Docker), fazer backup, ou evoluir o sistema. Compatível com Claude Code, Codex, Antigravity e Gemini CLI.
---

# Sistema de Fila Presencial Veterinária (Node + SQLite, rede local)

Pacote completo de gestão de atendimento presencial para clínicas e hospitais veterinários.
**Um programa só**: servidor Node + banco SQLite (um arquivo) + interface React já embutida. Roda na rede local
da clínica, sem internet, sem conta em nuvem e sem servidor de banco.

Repositório oficial: https://github.com/skroski/vetbots-fila-presencial

`$SKILL` = pasta desta skill (`~/.claude/skills/sistema-fila-presencial/`, `~/.agents/skills/...`, `~/.gemini/config/skills/...`).

---

## Instalar para um cliente (o caso mais comum)

Quem pede costuma **não ser técnico**. Fale em português simples, um passo por vez, sem despejar comandos: execute você mesmo e conte o resultado em uma frase.

1. **Pasta**: use `~/fila-clinica`, a menos que a pessoa indique outra. Só pergunte se a pasta já existir e não estiver vazia (nesse caso, pare e avise; para atualizar use o passo B).
2. **Node**: rode `node -v`. Precisa ser **22.16 ou mais novo**. Se faltar ou for antigo, não invente atalhos: peça para instalar a versão **LTS** em https://nodejs.org (no Windows com `winget`: `winget install OpenJS.NodeJS.LTS`) e reabrir o agente; ou ofereça Docker.
3. **Criar e instalar** (leva 1 a 2 minutos; o `npm install` já gera a interface):
   ```bash
   node "$SKILL/scripts/criar-projeto.mjs" ~/fila-clinica --install
   ```
4. **Ligar**: `cd ~/fila-clinica && npm start` **em segundo plano** (o servidor não termina). Leia os endereços que o servidor imprime; nunca invente o IP.
5. **Entregar** em uma lista curta: recepção `/`, TV `/tv`, consultório `/chamar`, totem `/totem`, métricas `/metricas`, ajustes `/config`, cada um com o IP real.
6. **Orientar o primeiro uso**: abrir `/config` (nome, cor, logotipo, serviços, salas, vídeos MP4) e o guia `docs/instalacao.html`, cujo **Tour guiado** ensina cada tela.
7. **Avisar sobre o dia a dia**: o servidor ligado por você para quando o agente fecha. Para uso contínuo: duplo clique em `iniciar.bat` (Windows) / `iniciar.command` (macOS), ou Docker (`docker compose up -d --build`), que liga sozinho. Para ligar junto com o computador: `references/instalacao.md`, seção "Iniciar junto com o computador".

Não precisa de chave de API, conta ou internet. Nunca exponha a porta 3000 na internet e nunca apague `data/`.

### Atualizar uma instalação existente
```bash
node "$SKILL/scripts/criar-projeto.mjs" <pasta> --atualizar
```
Troca só o código e **preserva `data/`** (banco, logotipo, vídeos) e `.env`. Depois `npm install && npm start`.

### Pedidos do dia a dia
| Pedido | O que fazer |
| :--- | :--- |
| Trocar cor, logotipo, vídeos, salas, serviços | É pela tela `/config`: oriente o caminho (`references/personalizacao.md`). Não mexa em código. |
| TV ou tablet não abre | `references/rede-local-lan.md` (mesma rede, firewall, IP fixo). |
| Backup / restaurar | `references/instalacao.md`, seção Backup. |
| Ligar com o computador | `references/instalacao.md`. |
| Campo, tela ou regra nova | Seção "Evoluir o sistema" abaixo. |

---

## Estrutura da skill

| Componente | Local | O que é |
| :--- | :--- | :--- |
| **Aplicativo completo** | `assets/app/` | Código pronto para instalar: `server/`, `web/`, `shared/`, Docker, scripts de início, `docs/instalacao.html`. |
| **Criador de projeto** | `scripts/criar-projeto.mjs` | Copia `assets/app/` para a pasta de destino (padrão `~/fila-clinica`); `--install`, `--atualizar`, `--git`. |
| **Instalador da skill** | `scripts/install.mjs` | Instala esta skill em Claude Code, Codex, Gemini/Antigravity. |
| **Instalação passo a passo** | `references/instalacao.md` | Windows, macOS, Linux, Docker, início automático, backup, atualização. |
| **Arquitetura e telas** | `references/arquitetura-e-telas.md` | As 6 telas, fluxo e regras. |
| **Banco e API** | `references/banco-sqlite-e-api.md` | Tabelas, regras de senha/prioridade, endpoints, tempo real (SSE). |
| **Personalização** | `references/personalizacao.md` | Cores, logotipo, vídeos MP4, layouts, codecs, PIN. |
| **Rede local** | `references/rede-local-lan.md` | IP fixo, firewall, Smart TVs, tablets. |
| **Totem e impressão** | `references/totem-e-impressao.md` | Kiosk, impressão térmica 58/80 mm. |
| **Possibilidades** | `references/possibilidades.md` | O que dá para evoluir. |
| **Agentes de IA** | `references/agentes.md` | Como cada agente usa esta skill. |

Requisitos: **Node.js 22.16+** (ou Docker). O SQLite vem embutido no Node (`node:sqlite`): sem módulo nativo, sem Python/Visual Studio no Windows.

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

## Evoluir o sistema
- Regras da fila: `server/queue.js`. Senhas são geradas dentro de transação `IMMEDIATE` (`transacao(fn, { imediata: true })` em `server/db.js`) + índice único `(ciclo, senha)`.
- Rotas: `server/app.js`. Configurações editáveis: `server/config.js` (adicione a chave no `SCHEMA` e use em `web/src/types/queue.ts`).
- Nova coluna/tabela: **acrescente** um item ao fim de `MIGRATIONS` em `server/db.js` (nunca edite os anteriores; a versão fica em `PRAGMA user_version`).
- Telas: `web/src/pages/`. Cores sempre por `brand-*` (nunca `emerald-*`): vêm da cor escolhida em `/config`.
- Teste: `npm test` (API: concorrência de senhas, fluxo completo, Range 206, SSE, PIN, backup). `npm run dev` roda API + Vite com recarga.

---

## Decisões importantes (não desfazer sem avisar o usuário)

- **SQLite local**: sem nuvem e sem servidor de banco. Dados em `data/fila.db` (WAL). Backup: copiar a pasta `data/` ou botão em Ajustes; o servidor também gera backup diário automático em `data/backups/`.
- **Rede local apenas**: não há login de usuário. Quem está na rede abre as telas. Os Ajustes podem ter PIN (`ADMIN_PIN`). **Não exponha a porta na internet.**
- **Numeração reinicia todo dia** (configurável em Ajustes). O "dia" é o do fuso do computador servidor (no Docker, `TZ`, padrão `America/Sao_Paulo`).
- **Vídeos**: MP4 H.264 + AAC é o formato seguro para Smart TVs. Ficam em `data/uploads/videos` e são servidos com HTTP Range (necessário em TVs e Safari).
- Tudo em português do Brasil; interface sem dependência de internet (fontes e ícones embutidos no build).

## Verificação mínima antes de entregar
`npm test` verde → `npm run build` ok → `npm start` → abrir `/`, `/tv`, `/chamar`, `/totem`, `/config` → emitir uma senha, chamar no consultório e ver a TV tocar/pulsar → subir um MP4 em Ajustes → trocar a cor e ver todas as telas mudarem.
