# Sistema de Fila Presencial Veterinária

© 2026 VetBots. Pacote proprietário: uso interno autorizado, sem redistribuição, revenda, sublicenciamento ou publicação de cópias. Veja `assets/app/LICENSE.md`.

Esta pasta é uma **skill para agentes de IA** (Claude Code, Codex, Antigravity/Gemini CLI) que instala sozinha o sistema de fila da clínica: recepção, TV com vídeos, chamador de consultório, totem e métricas. Funciona na rede local, sem internet e sem chave de API.

## Instalar em 2 passos

**1. Instale o Node.js** (versão **LTS**, 22.16 ou mais nova) em https://nodejs.org. Se já tem, pule.

**2. Coloque a skill no seu agente.** Com esta pasta aberta num terminal:

```bash
node scripts/install.mjs
```

Ele detecta Claude Code, Codex e Gemini/Antigravity e instala em todos. Para escolher um: `node scripts/install.mjs claude` (ou `codex`, `gemini`).

> Sem terminal? Copie esta pasta inteira (`sistema-fila-presencial`) para `~/.claude/skills/` (Claude Code) ou `~/.agents/skills/` (Codex).

## Usar

Abra o Claude Code (ou Codex / Gemini) em qualquer pasta e escreva:

```text
Instale o sistema de fila presencial da clínica e me mostre os endereços.
```

O agente instala em `~/fila-clinica`, liga o sistema e entrega o endereço de cada tela. Depois, abra `/config` para colocar nome, cor, logotipo e vídeos, e abra o guia `docs/instalacao.html` (dentro da pasta instalada) para o **Tour guiado** com voz.

No dia a dia, ligue o sistema com **duplo clique em `iniciar.bat`** (Windows) ou **`iniciar.command`** (macOS) dentro de `~/fila-clinica`.

Outros pedidos úteis:

- "Atualize o sistema da clínica." (preserva todos os dados)
- "Faça um backup agora."
- "A TV não abre o endereço."
- "Faça o sistema ligar junto com o computador."

## Sem agente de IA

Também dá para instalar direto, sem skill:

```bash
node scripts/criar-projeto.mjs --install      # cria ~/fila-clinica
cd ~/fila-clinica && npm start
```

Docker: `docker compose up -d --build` dentro da pasta criada.

## Mais detalhes

`SKILL.md` (fluxo completo do agente) · `references/instalacao.md` (Windows, macOS, Linux, Docker, backup) · repositório: https://github.com/skroski/vetbots-fila-presencial
