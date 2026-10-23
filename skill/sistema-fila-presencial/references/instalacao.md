# Instalação passo a passo

Requisitos: **Node.js 22.16 ou superior** (https://nodejs.org, versão LTS) **ou** Docker. Nenhum banco de dados para instalar, nenhuma chave de API.

O guia visual com tour guiado (com voz) está em `docs/instalacao.html` (abra no navegador).

## 1. O jeito mais fácil: peça ao agente

Com a skill instalada (`node scripts/install.mjs`), abra o Claude Code, Codex ou Antigravity/Gemini CLI e escreva:

```text
Instale o sistema de fila presencial da clínica e me mostre os endereços.
```

O agente instala em `~/fila-clinica`, liga o servidor e entrega os endereços. Ele confirma a pasta apenas se ela já tiver conteúdo, e nunca apaga `data/`.

Sem agente, direto pelo terminal (cria `~/fila-clinica`; informe outra pasta como argumento, se quiser):

```bash
node scripts/criar-projeto.mjs --install
cd ~/fila-clinica && npm start
```

Quem tem o repositório pode também rodar `npm install` e `npm start` na própria pasta, ou receber o ZIP do sistema e seguir o passo 2.

## 2. Instalar e iniciar sem agente

### Windows
1. Instale o Node.js LTS (instalador `.msi`, avançar até o fim).
2. Dê **duplo clique em `iniciar.bat`**. Na primeira vez ele instala tudo; depois só inicia.
3. Deixe a janela preta aberta (é o servidor). Os endereços das telas aparecem nela.

Pelo terminal: `npm install` e depois `npm start`.

### macOS / Linux
```bash
npm install
npm start
```
No macOS também serve dar duplo clique em `iniciar.command`.

### Docker (recomendado para deixar fixo no computador da recepção)
```bash
docker compose up -d --build
```
Sobe sozinho quando o computador liga (`restart: unless-stopped`). Dados em `./data`.

## 3. Primeiro acesso

O terminal mostra algo como:
```
Recepção / triagem               http://192.168.1.50:3000/
Telão da TV                      http://192.168.1.50:3000/tv
Chamador do consultório          http://192.168.1.50:3000/chamar
Totem de autoatendimento         http://192.168.1.50:3000/totem
Ajustes (cores, logo, vídeos)    http://192.168.1.50:3000/config
```
Abra `/config` e: troque o **nome** e a **cor**, envie o **logotipo**, envie os **vídeos MP4**, ajuste **salas** e **serviços**.

## 4. Variáveis opcionais (arquivo `.env` ou ambiente)

| Variável | Padrão | Para que serve |
| :--- | :--- | :--- |
| `PORT` | `3000` | Porta do sistema (use outra se a 3000 estiver ocupada). |
| `ADMIN_PIN` | vazio | PIN que protege `/config`. |
| `DATA_DIR` | `./data` | Onde ficam banco, logotipo, vídeos e backups. |
| `MAX_VIDEO_MB` | `2048` | Limite de tamanho por vídeo. |
| `TZ` | fuso do computador | Define a virada do dia (numeração das senhas). No Docker: `America/Sao_Paulo`. |

Exemplos: `PORT=3001 ADMIN_PIN=1234 npm start` (macOS/Linux) · `set PORT=3001 && npm start` (Windows cmd).

## 5. Iniciar junto com o computador

- **Docker**: já inicia sozinho.
- **Windows**: `Win+R` → `shell:startup` → coloque um atalho do `iniciar.bat` na pasta.
- **macOS**: Ajustes → Geral → Itens de início → adicione `iniciar.command`.
- **Linux**: serviço `systemd` apontando para `node server/index.js` na pasta do projeto.

## 6. Backup e restauração

- **Automático**: o servidor grava uma cópia por dia em `data/backups/auto-AAAA-MM-DD.db` (guarda as últimas 14).
- **Manual**: botão *Baixar backup do banco* em `/config` → Sistema, ou `npm run backup`.
- **Tudo junto** (banco + logotipo + vídeos): copie a pasta `data/` inteira.
- **Restaurar**: pare o sistema, substitua `data/fila.db` pelo backup (apague `fila.db-wal` e `fila.db-shm` se existirem) e inicie de novo.

## 7. Atualizar para uma versão nova

```bash
git pull
npm install
npm start
```
A pasta `data/` (seus dados) nunca é sobrescrita. Com a skill: `node $SKILL/scripts/criar-projeto.mjs <pasta> --atualizar` (troca só o código; `data/` e `.env` ficam intactos).
O banco evolui sozinho (migrações automáticas no início).

## 8. Help guiado

Abra `docs/instalacao.html` no navegador e clique em **Tour guiado**: ele percorre instalação, endereços, personalização, recepção, chamador, totem, telão, métricas, TV, backup e checklist. A voz vem de MP3 já incluídos no pacote (`docs/open-help/`): não precisa de internet, chave ou configuração. Se um áudio não tocar, o texto na tela continua disponível.

## 9. Problemas comuns

| Sintoma | Causa / solução |
| :--- | :--- |
| `A porta 3000 já está em uso` | Outro programa usa a 3000. Inicie com `PORT=3001`. |
| TV/tablet não abre o endereço | Estão em outra rede/Wi-Fi, ou o firewall bloqueia a porta. Veja `rede-local-lan.md`. |
| "A interface ainda não foi gerada" | Rode `npm run build` e reinicie. |
| "Node.js ... é antigo demais" ao iniciar | Instale o Node.js 22.16 ou superior (LTS) em nodejs.org, ou use Docker. |
| Vídeo não toca na TV | Converta para MP4 H.264/AAC (comando em `personalizacao.md`). |
| Senhas reiniciam em horário estranho | Fuso do servidor. Ajuste o horário/fuso do computador (ou `TZ` no Docker). |
