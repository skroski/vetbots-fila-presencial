# VetBots · Fila Presencial

Sistema de **fila presencial para clínicas e hospitais veterinários**, pronto para instalar e rodar na **rede local** da clínica. Sem internet, sem conta em nuvem, sem servidor de banco de dados: é **Node.js + SQLite** em um programa só.

| Tela | Endereço | Para quê |
| :--- | :--- | :--- |
| Recepção & Triagem | `/` | Emitir senhas, prioridade (normal, preferencial, emergência), transferir, imprimir cupom |
| **Telão da TV** | `/tv` | Senha gigante, sinal sonoro, modo privacidade e **playlist de vídeos MP4** em loop |
| Chamador do consultório | `/chamar` | "Chamar próximo" com 1 clique, repetir, iniciar, finalizar, não compareceu, transferir |
| Totem de autoatendimento | `/totem` | Tutor retira a senha sozinho (touch + impressora térmica) |
| Métricas | `/metricas` | Tempo médio de espera e de atendimento, volume por serviço, ausências |
| **Ajustes** | `/config` | **Cor da marca, logotipo**, vídeos da TV, salas, serviços, cupom, backup |

## Instalar em 3 passos

Precisa do [Node.js](https://nodejs.org) 22.16 ou superior (versão LTS) **ou** do Docker.

```bash
git clone https://github.com/skroski/vetbots-fila-presencial.git
cd vetbots-fila-presencial
npm install     # instala e já gera a interface
npm start       # sobe o sistema e mostra os endereços de cada tela
```

No **Windows** (sem terminal): instale o Node.js e dê duplo clique em `iniciar.bat`.
Com **Docker**: `docker compose up -d --build`.

Abra `http://IP-DO-COMPUTADOR:3000/config` e personalize: nome, **cor**, **logotipo**, **vídeos MP4**, salas e serviços.

> Guia visual completo, com tour guiado: abra **`docs/instalacao.html`** no navegador (dê duplo clique no arquivo depois de baixar o projeto).

## Dados e backup

Tudo fica em `data/` (banco `fila.db`, logotipo, vídeos, backups). O sistema faz **backup automático diário** em `data/backups/`; também há o botão em *Ajustes → Sistema* e `npm run backup`. Para mudar de computador, copie a pasta `data/`.

## Configuração opcional (`.env.example`)

`PORT` (3000) · `ADMIN_PIN` (protege `/config`) · `DATA_DIR` · `MAX_VIDEO_MB` · `TZ`.

## Para desenvolvedores

```bash
npm run dev      # API (porta 3000) + interface com recarga (porta 5173)
npm test         # 15 testes de API: concorrência de senhas, fluxo completo, vídeo (Range), SSE, PIN, backup
npm run build    # gera web/dist
npm run demo     # cria pacientes de exemplo na fila
```

```
server/   API Express, regras da fila, SQLite embutido no Node (node:sqlite), SSE, uploads, backup
web/      React 18 + Vite + Tailwind (telas)
shared/   gerador da paleta da marca (usado no servidor e na tela de Ajustes)
docs/     instalacao.html (guia com tour guiado)
skill/    skill "sistema-fila-presencial" para Claude Code, Codex, Antigravity e Gemini CLI
```

## Skill para agentes de IA

`skill/sistema-fila-presencial/` leva este pacote dentro dela (`assets/app/`) e instala/atualiza o sistema em qualquer pasta:

```bash
node skill/sistema-fila-presencial/scripts/install.mjs      # instala a skill nos agentes da máquina
node skill/sistema-fila-presencial/scripts/criar-projeto.mjs ~/fila-clinica --install
```

Depois de mudar o código aqui, rode `npm run sync-skill` para atualizar a cópia dentro da skill.

## Segurança

Feito para a **rede interna**: não há login de usuários (os Ajustes aceitam PIN). **Não exponha a porta na internet.**
