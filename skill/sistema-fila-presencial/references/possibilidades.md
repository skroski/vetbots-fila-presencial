# Possibilidades: o que dá para fazer a partir daqui

## Já está pronto
Recepção, TV com playlist de vídeos MP4 (2 layouts), chamador, totem com impressão térmica, métricas, personalização de cor e logotipo, ajustes de salas/serviços, PIN dos Ajustes, backup diário automático e manual, Docker, instalação por duplo clique.

## O que mudou em relação à versão com Supabase
| | Antes (Supabase) | Agora (SQLite) |
| :--- | :--- | :--- |
| Banco | Postgres na nuvem ou Docker | Um arquivo `data/fila.db` |
| Instalação | Criar projeto, rodar migrações SQL, configurar chaves | `npm install` + `npm start` |
| Tempo real | Supabase Realtime | SSE próprio + consulta a cada 10 s |
| Acesso de fora da clínica | Sim (nuvem) | **Não**: só rede local (de propósito) |
| Login | Supabase Auth (opcional) | PIN opcional nos Ajustes |
| Configurações (salas/serviços) | Só no navegador (não persistiam) | No banco, para todos os aparelhos |
| Cores / logotipo | Variáveis de build (`VITE_CLINIC_NAME`) | Pela tela de Ajustes, sem recompilar |
| Vídeos | Não existia | Playlist MP4 na TV |
| Backup | Do provedor | Diário automático + botão + copiar `data/` |

Também ganhou: "Chamar Próximo" atômico no servidor, numeração diária, números sem repetição garantidos por índice único, mensagens de erro na tela, aviso de falta de conexão, fontes embutidas (offline).

## Próximos passos possíveis (por esforço)

**Pequeno (horas)**
- Imagens (JPG/PNG) na playlist da TV, com tempo de exibição por slide.
- Rolagem de avisos/notícias da clínica (texto corrido no rodapé da TV).
- Voz na chamada: *"Senha A014, Thor, Consultório 2"* via `speechSynthesis` do navegador (sem custo).
- Mais temas (TV em modo claro; cor do fundo).
- Horário de funcionamento: mensagem "fila encerrada" fora do expediente.
- Exportar histórico/métricas em CSV.

**Médio (dias)**
- Contas de usuário com perfis (recepção, veterinário, gestão) e auditoria de quem chamou/finalizou.
- Pesquisa de satisfação por QR code na senha ou na TV após o atendimento.
- Estimativa de tempo de espera por senha (usa o TMA real).
- Painel por sala (TV pequena em cada corredor) com `/tv?sala=<id>`.
- Chamada de paciente também pelo WhatsApp ("sua vez está chegando", via uazapi/API oficial) com envio pelo servidor.
- Cadastro de tutores/pets para preencher automático e histórico por tutor.

**Grande (semanas)**
- Integração com o dashboard Cuidado Vet / agenda: puxar o agendamento do dia, check-in que já gera a senha, e devolver o status para a ficha do paciente (a API REST já permite).
- Sincronização entre unidades (servidor na nuvem + servidores locais com fila offline-first).
- Aplicativo de celular do veterinário (PWA) com notificação de "próximo paciente".
- Instalador `.exe`/`.dmg` único (empacotar Node + app) para clínicas sem nenhum conhecimento técnico.

## Limites a ter em mente
- **Um servidor por clínica.** Se o computador servidor desligar, as telas ficam sem conexão até ele voltar. Use um mini-PC dedicado + Docker para ser sempre ligado.
- Sem login por padrão: confie na rede interna e use `ADMIN_PIN`.
- Vídeos grandes ocupam disco do servidor (`data/uploads/videos`); a TV precisa conseguir tocar H.264.
