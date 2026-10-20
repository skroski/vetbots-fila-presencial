# Sistema de Fila Presencial Veterinária (Node + SQLite)

Pacote com a **skill para agentes de IA** e o **aplicativo completo** (`assets/app/`) de fila presencial para clínicas veterinárias: recepção, telão de TV com vídeos MP4, chamador de consultório, totem e métricas. Roda na rede local, sem internet e sem Supabase.

## Início rápido

1. Instalar a skill nos seus agentes (Claude Code, Codex, Antigravity, Gemini):
   ```bash
   node scripts/install.mjs
   ```
2. Criar o sistema em uma pasta e instalar:
   ```bash
   node scripts/criar-projeto.mjs ~/fila-clinica --install
   cd ~/fila-clinica && npm start
   ```
3. Abra o endereço que aparece no terminal e personalize em `/config` (cor, logotipo, vídeos).

Requisito: Node.js 22.16+ (ou Docker). Guia completo: `references/instalacao.md` e `assets/app/docs/instalacao.html`.

Repositório do aplicativo: https://github.com/skroski/vetbots-fila-presencial
