# Instruções para Claude Code: Sistema de Fila Presencial

Quando o usuário falar de fila presencial, chamada na TV, chamador de consultório, totem, cupom de senha ou vídeos da sala de espera:

1. Leia `SKILL.md` (visão geral e fluxo do agente).
2. Instalar em uma pasta: `node scripts/criar-projeto.mjs <pasta> --install`. Atualizar: `--atualizar`.
3. O aplicativo (Node + SQLite + React) está em `assets/app/`. Banco: `references/banco-sqlite-e-api.md`.
4. Cores, logotipo e vídeos: pela tela `/config` (`references/personalizacao.md`).
5. Rede local, firewall e Smart TVs: `references/rede-local-lan.md`. Instalação: `references/instalacao.md`.
6. Nunca apague a pasta `data/` de uma instalação.
