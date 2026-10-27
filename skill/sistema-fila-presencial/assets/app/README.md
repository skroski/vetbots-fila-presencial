# Fila Presencial · VetBots

© 2026 VetBots. Uso interno autorizado; não redistribuir, revender ou publicar cópias. Veja [LICENSE.md](LICENSE.md).

Sistema de fila presencial da clínica: recepção, TV, consultório, totem e métricas. Roda **só na rede local**, sem internet, sem conta em nuvem e sem chave de API.

## Ligar o sistema

| Sistema | Como |
| --- | --- |
| Windows | Duplo clique em **`iniciar.bat`** |
| macOS | Duplo clique em **`iniciar.command`** |
| Linux | `npm start` |
| Docker | `docker compose up -d --build` (liga sozinho com o computador) |

Deixe a janela aberta enquanto a clínica estiver em uso: ela é o servidor. Para desligar, feche a janela.

Na primeira vez (ou se der erro de interface ausente), rode `npm install` e depois `npm run build`.

## Telas

A janela mostra o IP do computador. Nos outros aparelhos, na mesma rede, abra:

| Tela | Endereço | Para quê |
| --- | --- | --- |
| Recepção | `http://IP:3000/` | Emitir e organizar senhas |
| Telão | `http://IP:3000/tv` | Chamada, som e vídeos |
| Consultório | `http://IP:3000/chamar` | Chamar, iniciar e finalizar |
| Totem | `http://IP:3000/totem` | Autoatendimento touch |
| Métricas | `http://IP:3000/metricas` | Espera e volume |
| Ajustes | `http://IP:3000/config` | Marca, salas, serviços, TV e backup |

Comece por **`/config`**: nome, cor, logotipo, serviços, salas e vídeos MP4.

Para aprender cada tela, clique em **Ajuda** na barra de navegação do sistema (ou abra `http://IP:3000/ajuda/`) e use o **Tour guiado** (com voz, funciona sem internet). O mesmo guia está em [docs/instalacao.html](docs/instalacao.html).

## Pedir ajuda ao Claude, Codex ou Gemini

Abra o agente **nesta pasta** e peça em português, por exemplo:

- "Ligue o sistema e me mostre os endereços."
- "Faça um backup agora."
- "A TV não abre o endereço, me ajude a descobrir por quê."
- "Faça o sistema ligar junto com o computador."

## Dados e backup

Tudo da clínica fica em `data/`: banco, logotipo, vídeos e backups. **Nunca apague essa pasta.**

- Backup automático por dia em `data/backups/`; manual em Ajustes → Sistema ou `npm run backup`.
- Para trocar de computador: pare o sistema e copie a pasta `data/` inteira.
- Defina `ADMIN_PIN` para proteger a tela de Ajustes.
- Não encaminhe a porta 3000 para a internet.

## Configurações opcionais

Copie `.env.example` para `.env` só se precisar mudar algo:

| Variável | Padrão | Função |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP |
| `ADMIN_PIN` | vazio | Protege Ajustes |
| `DATA_DIR` | `./data` | Banco e uploads |
| `MAX_VIDEO_MB` | `2048` | Limite por vídeo |
| `TZ` | fuso local | Virada diária das senhas |

## Problemas comuns

| Sintoma | O que fazer |
| --- | --- |
| Porta 3000 ocupada | Inicie com outra porta: `PORT=3001 npm start` |
| TV ou tablet não abre o endereço | Confirme a mesma rede/Wi-Fi e libere a porta no firewall (rede privada) |
| "A interface ainda não foi gerada" | Rode `npm run build` e reinicie |
| "Node.js antigo demais" | Instale o Node 22.16+ (LTS) em nodejs.org, ou use Docker |
| Vídeo não toca na TV | Use MP4 H.264/AAC com `+faststart` |
| Senhas viram o dia no horário errado | Corrija o fuso do computador ou defina `TZ` |

## Apoio, Doações e Consultoria

### 💚 Conseguiu instalar e usar com sucesso?
Se este sistema organizou a fila do seu atendimento e está rodando bem no dia a dia da clínica, **considere colaborar com o projeto!** Sua colaboração ajuda a manter o software livre, atualizado e independente.

Você também pode contribuir sugerindo melhorias, criando novas funcionalidades ou **apadrinhando funcionalidades** (patrocinando o desenvolvimento de recursos sob medida que a sua clínica precisa).

Faça sua doação de qualquer valor pela chave Pix:
- **Chave Pix:** `4199865410`

---

### 🛠️ Precisa de ajuda para instalar e botar em prática?
Precisa de suporte especializado para instalar, configurar a rede local (Wi-Fi/LAN), conectar Smart TVs, tablets, totem touch com impressora térmica ou treinar sua equipe?

**Podemos ser contratados para prestar consultoria por hora**, com acompanhamento técnico direto do início ao fim:
- **WhatsApp:** [55 41 99865-410](https://wa.me/554199865410) (clique para falar conosco)

---

### 💻 Para desenvolvedores
Se você é desenvolvedor, **colabore com o projeto Open Source, não seja mala!** Envie pull requests com melhorias, compartilhe ideias construtivas, ajude a aprimorar o código e fortaleça o ecossistema livre em vez de apenas criticar.
