# VetBots · Fila Presencial

© 2026 VetBots. Sistema de fila presencial veterinária.

Este repositório é proprietário. O uso interno autorizado não permite redistribuir, revender, sublicenciar ou publicar cópias. Consulte [LICENSE.md](LICENSE.md).

Sistema de atendimento para clínicas e hospitais veterinários: a recepção emite senhas, o veterinário chama pelo consultório, a TV anuncia, o totem faz autoatendimento e o gestor acompanha métricas.

Roda **na rede local** (Node.js + SQLite). Sem conta em nuvem, sem banco externo, sem chave de API e sem internet durante o uso. Única exceção, opcional: vídeos do YouTube na TV, que precisam de internet no aparelho da TV (os MP4 enviados tocam offline).

---

## Instalar

Você só precisa do **Node.js 22.16 ou mais novo** (versão LTS, em [nodejs.org](https://nodejs.org)). Escolha **um** caminho:

### A) Com o Claude Code, Codex ou Gemini (o mais simples)

1. Instale o Node.js (link acima).
2. Abra o seu agente de IA **dentro desta pasta**.
3. Escreva:

   ```text
   Instale o sistema de fila presencial e me mostre os endereços.
   ```

O agente instala, liga o sistema e entrega os endereços de cada tela. Ele só pergunta o que não conseguir descobrir sozinho (por exemplo, em qual pasta instalar; o padrão é `fila-clinica` na sua pasta de usuário). Seus dados nunca são apagados.

### B) Sem agente de IA

| Sistema | Como iniciar |
| --- | --- |
| Windows | Dê **duplo clique em `iniciar.bat`** |
| macOS | Dê **duplo clique em `iniciar.command`** |
| Linux | `npm install` e depois `npm start` |
| Docker | `docker compose up -d --build` (liga sozinho com o computador) |

Na primeira vez a instalação leva 1 a 2 minutos. Deixe a janela aberta: ela é o servidor, e mostra o endereço de cada tela.

---

## Primeiro uso

O servidor mostra o IP do computador. Nos outros aparelhos (TV, tablet, totem), na mesma rede, abra:

| Tela | Endereço | Para quê |
| --- | --- | --- |
| Recepção | `http://IP:3000/` | Emitir e organizar senhas |
| Telão | `http://IP:3000/tv` | Chamada, som e vídeos |
| Consultório | `http://IP:3000/chamar` | Chamar, iniciar e finalizar |
| Totem | `http://IP:3000/totem` | Autoatendimento touch |
| Métricas | `http://IP:3000/metricas` | Espera e volume |
| Ajustes | `http://IP:3000/config` | Marca, salas, serviços, TV e backup |

**Comece por `/config`:** nome da clínica, cor, logotipo, serviços, salas e vídeos da TV (MP4 enviados ou link do YouTube).

Para aprender cada tela, clique em **Ajuda** na barra de navegação do sistema (ou abra `http://IP:3000/ajuda/`). O **Tour guiado** (com voz) funciona sem internet e percorre todos os módulos. O mesmo guia está em [docs/instalacao.html](docs/instalacao.html).

---

## Dados, backup e segurança

Tudo da clínica fica na pasta `data/`: banco, logotipo, vídeos e backups.

- Backup automático diário em `data/backups/`; manual em Ajustes → Sistema ou `npm run backup`.
- Para trocar de computador, copie a pasta `data/` inteira com o sistema parado.
- Defina `ADMIN_PIN` para proteger a tela de Ajustes.
- Use só na rede interna: **não** encaminhe a porta 3000 para a internet.

## Problemas comuns

| Sintoma | O que fazer |
| --- | --- |
| Porta 3000 ocupada | Inicie com outra porta: `PORT=3001 npm start` |
| TV ou tablet não abre o endereço | Confirme que está no mesmo Wi-Fi/rede e libere a porta no firewall (rede privada) |
| "A interface ainda não foi gerada" | Rode `npm run build` e reinicie |
| "Node.js antigo demais" | Instale o Node 22.16+ (LTS) ou use Docker |
| Vídeo não toca na TV | Use MP4 H.264/AAC com `+faststart`. Vídeo do YouTube: confira a internet da TV e se o dono permite exibir em outros sites (senão a TV pula para o próximo) |
| Senhas viram o dia no horário errado | Corrija o fuso do computador ou defina `TZ` |

## Ajuda para instalar

Se este projeto foi útil, você pode contribuir com qualquer valor pela chave Pix:

**554199865410**

Precisa de ajuda para instalar, configurar a rede, preparar a TV, o totem ou treinar a equipe? Fale pelo WhatsApp **55 41 99865-410**. Fazemos a instalação e o acompanhamento por um valor por hora combinado previamente.

---

## Para desenvolvedores

Estrutura: `server/` (API Express, SQLite, fila, SSE, uploads, backup) · `web/` (React, Vite, Tailwind) · `shared/` (paleta) · `docs/` (manual e Help offline) · `skill/` (skill para agentes + cópia instalável do app).

```bash
git clone https://github.com/skroski/vetbots-fila-presencial.git
cd vetbots-fila-presencial
npm install        # também gera a interface
npm run dev        # API + Vite com recarga
npm test           # testes da API
npm run build
node scripts/demo-dados.mjs   # dados de demonstração
npm run backup
```

### Variáveis opcionais

Copie `.env.example` para `.env` só se precisar mudar algo.

| Variável | Padrão | Função |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP |
| `ADMIN_PIN` | vazio | Protege Ajustes |
| `DATA_DIR` | `./data` | Banco e uploads |
| `MAX_VIDEO_MB` | `2048` | Limite por vídeo |
| `TZ` | fuso local | Virada diária das senhas |

### Demonstração online (Vercel)

Para mostrar o sistema a clientes sem instalar nada, o repositório já está pronto para a Vercel. A demonstração é **só uma vitrine**: roda inteira no navegador, com dados fictícios salvos no `localStorage` e as abas do mesmo navegador sincronizadas (recepção, TV e consultório). Não há servidor nem banco. Envio de logotipo, vídeos e backup ficam desativados.

O **sistema real não muda**: continua com servidor Node + SQLite na rede da clínica, porque recepção, TV e totem são aparelhos diferentes e precisam compartilhar a mesma fila.

Para publicar: na Vercel, **Add New → Project**, importe este repositório e clique em Deploy. O `vercel.json` já define o comando de build (`npm run build:demo`) e a saída (`web/dist-demo`). Para testar localmente:

```bash
npm run build:demo
npx vite preview --mode demo --config web/vite.config.ts
```

Os dados de exemplo são regerados a cada 12 horas; o botão **Reiniciar** no selo da demonstração volta ao início na hora, e o **X** fecha o aviso. O guia de instalação também fica disponível em `/ajuda/`. O código fica em `web/src/demo/` e só entra no build feito com `--mode demo`.

### Skill para agentes de IA

A pasta `skill/sistema-fila-presencial/` é a skill (Claude Code, Codex, Antigravity/Gemini CLI) e leva o app completo dentro, para instalar offline em qualquer clínica. Para tê-la disponível em qualquer pasta:

```bash
node skill/sistema-fila-presencial/scripts/install.mjs          # detecta os agentes
node skill/sistema-fila-presencial/scripts/install.mjs claude   # ou codex, gemini, all
node skill/sistema-fila-presencial/scripts/install.mjs --list   # onde está instalada
```

Depois, em qualquer pasta, peça ao agente: *"Use a skill sistema-fila-presencial e instale a fila na clínica."* Ou rode direto:

```bash
node skill/sistema-fila-presencial/scripts/criar-projeto.mjs               # instala em ~/fila-clinica
node skill/sistema-fila-presencial/scripts/criar-projeto.mjs ~/outra --install
node skill/sistema-fila-presencial/scripts/criar-projeto.mjs ~/fila-clinica --atualizar   # preserva data/ e .env
```

Depois de editar o app, sincronize a cópia da skill (nunca edite `assets/app/` à mão):

```bash
npm run sync-skill
```

### Help guiado (narração Fish Audio)

O tour de [docs/instalacao.html](docs/instalacao.html) usa **somente** MP3 gerados pelo Fish Audio e versionados em `docs/open-help/v<versão>/`; não usa a voz do navegador. O cliente final não precisa de chave.

Ao alterar texto, narração, voz ou passos do tour: aumente `JOURNEY.version`, gere os MP3 e revise antes de publicar.

```bash
npm run help:audio                      # gera os que faltam
npm run help:audio -- --step=tv --force # refaz um passo
npm run help:audio -- --force           # refaz todos
```

Configure `FISH_AUDIO_API_KEY`, `FISH_AUDIO_REFERENCE_ID` (opcional) e `FISH_AUDIO_MODEL` apenas no `.env` local (ignorado pelo git). Nunca coloque chaves no código, no `.env.example`, nos MP3, nos logs ou no navegador.
