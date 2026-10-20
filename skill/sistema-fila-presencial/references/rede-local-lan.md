# Rede local (LAN): IP, firewall, TVs e consultórios

O sistema roda em **um computador da clínica** (o servidor) e as demais telas o acessam pelo navegador, na mesma rede Wi-Fi/cabo. Não precisa de internet.

```
            [ Roteador / Wi-Fi da clínica ]
                         |
   +---------------------+----------------------+
   |                     |                      |
[ Servidor ]        [ Smart TV ]         [ Consultórios / Totem ]
PC da recepção      /tv                  /chamar  ·  /totem
192.168.1.50:3000
```

## 1. Descobrir o IP do servidor
Ao iniciar, o terminal já imprime os endereços prontos (e `/config → Sistema` também). Se precisar:
- **Windows**: `ipconfig` → "Endereço IPv4"
- **macOS**: `ipconfig getifaddr en0` (Wi-Fi) ou `en1` (cabo)
- **Linux**: `hostname -I`

**Fixe o IP**: no roteador, crie uma *reserva de DHCP* para o computador servidor (ex.: 192.168.1.50). Assim os favoritos da TV e dos consultórios nunca param de funcionar.

## 2. Firewall do servidor
O sistema escuta em `0.0.0.0` (toda a rede). Libere a porta (padrão 3000):
- **Windows** (PowerShell como administrador):
  ```powershell
  New-NetFirewallRule -DisplayName "Fila Presencial" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
  ```
  (O Windows também pergunta ao abrir o Node pela primeira vez: marque *Redes privadas*.)
- **macOS**: Ajustes → Rede → Firewall → permitir conexões para o Node/Docker.
- **Linux**: `sudo ufw allow 3000/tcp`

**Não abra essa porta na internet** (roteador/port forwarding). O sistema foi feito para a rede interna.

## 3. Smart TV (sala de espera)
1. TV na mesma rede. Abra o navegador da TV e digite `http://IP-DO-SERVIDOR:3000/tv`.
2. Toque no botão de tela cheia (ou use o modo tela cheia do navegador da TV).
3. Dê um clique na tela com o controle: libera o áudio.
4. Salve nos favoritos.

Dicas:
- **Samsung (Tizen) / LG (webOS)**: o navegador nativo funciona; vídeos devem ser MP4 H.264/AAC.
- **Fire TV Stick / Android TV / Chromecast com Google TV**: use o *Fully Kiosk Browser* apontando para `/tv`: abre sozinho em tela cheia quando a TV liga e não deixa a tela apagar.
- **Mini-PC ou notebook ligado na TV (HDMI)**: Chrome com `--kiosk http://IP:3000/tv`. É a opção mais estável.
- Desative a economia de energia/proteção de tela da TV.

## 4. Consultórios
Cada sala tem um link próprio em `/config → Consultórios & Salas → Link do chamador` (`/chamar/<id>`). No Chrome/Edge: ⋮ → *Transmitir, salvar e compartilhar* → *Criar atalho* → marque *Abrir como janela*. O ícone abre direto na sala certa.

## 5. Totem
`http://IP:3000/totem` em tablet com Acesso Guiado (iPad) ou Fully Kiosk (Android). Impressão: ver `totem-e-impressao.md`.

## 6. Quando a rede falha
- Wi-Fi caiu um instante: as telas mostram a faixa vermelha e voltam sozinhas (SSE reconecta + consulta a cada 10 s).
- Servidor desligado/reiniciado: nada se perde (SQLite em disco); as telas voltam quando ele subir.
- Sem internet externa: **sem problema**. Nada depende dela.

## 7. Domínio amigável (opcional)
Dá para usar `http://fila.local:3000` configurando um nome no roteador (DNS local). Não é necessário.
