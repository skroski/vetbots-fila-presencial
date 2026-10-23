# Instruções para Claude Code: Sistema de Fila Presencial

Quando o usuário falar de fila presencial, senhas, chamada na TV, chamador de consultório, totem, cupom ou vídeos da sala de espera, siga o `SKILL.md` desta pasta. Em especial, a seção **Instalar para um cliente**.

Resumo da instalação (quem pede costuma não ser técnico: linguagem simples, um passo por vez):

1. Pasta de destino: `~/fila-clinica`, salvo se a pessoa indicar outra.
2. `node -v` precisa ser 22.16 ou mais novo (senão, peça o Node LTS em nodejs.org ou use Docker).
3. `node scripts/criar-projeto.mjs ~/fila-clinica --install`
4. Na pasta criada, `npm start` em segundo plano; informe os endereços reais impressos (`/`, `/tv`, `/chamar`, `/totem`, `/metricas`, `/config`).
5. Leve a pessoa a `/config` e ao `docs/instalacao.html` (Tour guiado). Explique que, para uso contínuo, deve usar `iniciar.bat`/`iniciar.command` ou Docker.

Regras: atualizar com `--atualizar`; nunca apagar `data/` nem `.env`; nunca inventar o IP; nunca expor a porta na internet; não pedir chave Fish Audio ao cliente (o áudio do guia já vem em MP3).

Referências: `references/instalacao.md`, `references/personalizacao.md`, `references/rede-local-lan.md`, `references/banco-sqlite-e-api.md`.
