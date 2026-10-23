# Instruções para agentes: VetBots Fila Presencial

Este repositório é o aplicativo (Node + SQLite + React) e a skill `sistema-fila-presencial` (em `skill/`).

## Se a pessoa quer instalar ou usar o sistema numa clínica

Siga `skill/sistema-fila-presencial/SKILL.md`, seção **Instalar para um cliente**. Resumo:

1. Confirme a pasta de destino (padrão: `~/fila-clinica`) e que `node -v` é 22.16 ou mais novo (ou use Docker).
2. `node skill/sistema-fila-presencial/scripts/criar-projeto.mjs <pasta> --install`
3. Dentro da pasta criada: `npm start` (em segundo plano) e informe os endereços reais impressos pelo servidor.
4. Leve a pessoa a `/config` e a `docs/instalacao.html`.

Fale em linguagem simples e um passo por vez. Nunca apague `data/`, nunca invente o IP e nunca exponha a porta 3000 na internet.

## Se a pessoa quer desenvolver

- `npm run dev`, `npm test`, `npm run build`.
- Depois de mudar o app, rode `npm run sync-skill`. Não edite `skill/**/assets/app/` à mão.
- Cores sempre por `brand-*`; textos em português do Brasil; nada de serviços externos ou banco em nuvem.
- A voz do Help (`docs/instalacao.html`) é somente MP3 Fish Audio versionado, sem `speechSynthesis`. Ao mudar o roteiro, aumente `JOURNEY.version` e rode `npm run help:audio`.
- Nunca commite `.env` nem chaves.
