# Personalização (tudo pela tela `/config`, sem editar código)

## Cor da marca
Ajustes → **Aparência**. Escolha uma das cores prontas ou use o seletor. O sistema gera sozinho os tons claros e escuros (`brand-50` … `brand-900`) e garante contraste de leitura (texto claro sobre fundo escuro, texto branco sobre botão). A mudança vale **em todas as telas abertas na hora** e fica gravada no banco.

Para programadores: o servidor injeta as variáveis CSS `--brand-*` no HTML (sem "piscar" a cor antiga) e o Tailwind usa `bg-brand-600`, `text-brand-400` etc. Gerador compartilhado: `shared/cores.js`. **Nunca use `emerald-*`**; use `brand-*`. Cores de prioridade (âmbar = preferencial, vermelho = emergência) são fixas de propósito.

## Logotipo
Ajustes → Aparência → *Enviar logotipo*: PNG, JPG, WebP ou SVG, até 5 MB (fundo transparente fica melhor). Aparece na recepção, TV, totem, no ícone da aba e (opcional, em preto e branco) no cupom impresso. Sem logotipo, usa o ícone 🐾 padrão.

## Vídeos da TV (MP4)
Ajustes → **TV & Vídeos** → *Enviar vídeos (MP4)*. Pode enviar vários de uma vez, reordenar (setas), pausar um (olho) ou excluir. A TV toca em sequência e volta ao primeiro, sem parar. Acompanhamento do envio por barra de progresso (arquivos grandes pelo Wi-Fi podem levar minutos).

**Layouts**
- *Vídeo + painel*: vídeo à esquerda; senha atual, chamadas recentes e próximos à direita, sempre visíveis.
- *Vídeo em tela cheia*: o vídeo ocupa tudo, com uma faixa inferior da chamada atual; ao chamar alguém, o aviso grande assume a tela por N segundos (4 a 60) e o vídeo volta.
- *Vídeo pequeno 16:9*: vídeo menor no canto, sempre em 16:9, e a senha gigante com contraste máximo (acima de 13:1, WCAG AAA) ocupando a maior parte da tela; chamadas anteriores e próximos em números grandes ao lado.
- Sem vídeo ativo: painel clássico de chamadas em destaque.

**Som**: por padrão os vídeos tocam **mudos** (navegadores só liberam autoplay sem som, e o sinal da chamada fica bem audível). Em Ajustes dá para ligar o som do vídeo; ele abaixa o volume durante a chamada. O primeiro toque/clique do controle remoto libera o áudio.

**Formato recomendado** (Smart TVs): MP4, vídeo H.264, áudio AAC, 1920×1080, 30 fps, até ~8 Mbps. Para converter qualquer vídeo:
```bash
ffmpeg -i entrada.mov -c:v libx264 -preset medium -crf 23 -vf "scale=1920:-2" -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart saida.mp4
```
`+faststart` faz o vídeo começar a tocar sem esperar baixar tudo. Também é aceito `.webm`, mas nem toda TV toca. Limite por vídeo: 2 GB (`MAX_VIDEO_MB`). O servidor confere o conteúdo real do arquivo (não só a extensão).

Se nenhum vídeo tocar (codec não suportado), a TV mostra um aviso discreto e tenta de novo a cada 30 s, sem travar as chamadas.

## Outros ajustes
- **Nome e subtítulo** da clínica (TV, totem, recepção, título da aba).
- **TV**: sinal sonoro padrão, modo privacidade (só a senha) por padrão. Cada TV pode sobrepor pelos botões da própria tela.
- **Cupom**: largura 58/80 mm, mensagem do rodapé, logotipo no cupom.
- **Salas e serviços**: criar, renomear, ativar/desativar, excluir (só se nunca usados). Prefixo = 1 ou 2 letras. Cada sala tem o botão *Link do chamador* (`/chamar/<id>`) para fixar no computador do consultório.
- **Numeração**: reiniciar todo dia (padrão) ou contínua.
- **PIN dos Ajustes**: defina `ADMIN_PIN` no ambiente/`.env`. Sem PIN, qualquer aparelho na rede abre `/config`.

## Identidade em pacote para outro cliente
Cada instalação guarda sua identidade em `data/`. Para entregar a outro cliente, use um **projeto novo** (sem `data/`) e personalize em `/config`. Não precisa editar código nem recompilar.
