# Agentes de IA: Claude Code, Codex, Antigravity e Gemini CLI

A skill `sistema-fila-presencial` segue o padrão aberto de Agent Skills (`SKILL.md` com frontmatter + `assets/` + `references/`) e funciona nos quatro ecossistemas.

## Onde instalar

| Agente | Pasta global | Arquivo de instrução | Invocação |
| :--- | :--- | :--- | :--- |
| Claude Code | `~/.claude/skills/sistema-fila-presencial/` | `CLAUDE.md` | `/sistema-fila-presencial` ou linguagem natural |
| Codex | `~/.agents/skills/` e `~/.codex/skills/` | `AGENTS.md` | `$sistema-fila-presencial` ou linguagem natural |
| Antigravity / Gemini CLI | `~/.gemini/config/skills/` | `GEMINI.md` | detecção automática |

Instalar em todos de uma vez (rode dentro da pasta da skill):
```bash
node scripts/install.mjs            # detecta os agentes
node scripts/install.mjs --list     # mostra onde está instalada
node scripts/install.mjs --uninstall
```

## Ferramentas equivalentes

| Ação | Claude Code | Codex | Antigravity / Gemini CLI |
| :--- | :--- | :--- | :--- |
| Executar comandos (node, npm, docker, git) | `Bash` | `shell` | `run_command` |
| Ler / editar / criar arquivos | `Read` / `Edit` / `Write` | `read_file` / `apply_patch` / `write_file` | `view_file` / `replace_file_content` / `write_to_file` |

## Pedidos típicos e o que fazer

- *"Instale o sistema de fila na pasta X"* → `node scripts/criar-projeto.mjs X --install`, depois `npm start` e informe os endereços impressos.
- *"Troque a cor/logo/vídeos"* → é pela tela `/config`; oriente o caminho. Só mexa em código se pedirem comportamento novo.
- *"Atualize o sistema da clínica"* → `criar-projeto.mjs <pasta> --atualizar` (preserva `data/` e `.env`) ou `git pull`.
- *"Quero um campo/tela/regra nova"* → leia `references/banco-sqlite-e-api.md`; altere `server/queue.js` + `web/src/pages/*`, acrescente migração em `server/db.js` se mexer em tabelas, rode `npm test` e `npm run build`.
- *"Preciso levar para outro repositório/branch"* → `criar-projeto.mjs <pasta> --git` e `git remote add origin ... && git push`.

## Regras para qualquer agente
1. Não adicione dependência de serviços externos ou de servidor de banco: o pacote é local e agnóstico por decisão.
2. Nunca apague nem sobrescreva `data/` de uma instalação existente.
3. Cores sempre `brand-*`; textos em português do Brasil.
4. Termine com `npm test`, `npm run build` e uma checagem visual de `/tv` e `/config`.
