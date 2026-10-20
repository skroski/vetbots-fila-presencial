# Totem de autoatendimento e impressão térmica

## Totem (`/totem`)
1. **Boas-vindas** com o logotipo/nome da clínica (de Ajustes) e botões grandes por serviço; Emergência em destaque.
2. **Formulário enxuto**: nome do tutor, nome do pet, opção de atendimento preferencial (Lei 10.048).
3. **Confirmação**: senha em destaque, impressão automática e retorno ao início em segundos.

Se o servidor estiver fora do ar, o totem mostra um aviso pedindo para procurar a recepção (nunca imprime uma senha que não foi registrada).

## Impressão do cupom
O cupom é gerado em HTML e impresso pelo navegador, então funciona com qualquer impressora térmica instalada no computador (USB ou rede): Epson TM-T20, Bematech, Elgin i9, POS-58 etc.

Em **Ajustes → Sistema → Cupom** você define: largura do papel (**58 mm** ou **80 mm**), mensagem do rodapé e se o **logotipo** sai impresso (convertido para preto e branco). O nome da clínica vem de Ajustes → Aparência.

Modelo:
```
[logotipo]
CLÍNICA CUIDADO VET
20/10/2026        10:45
+-------------------+
|     SUA SENHA     |
|       A014        |
+-------------------+
Serviço: Consulta Clínica
Tutor: Carlos Alberto
Pet: Thor
Prioridade: Normal
Acompanhe pelo telão da sala de espera.
```
Todos os textos são escapados (nome com `<` ou `&` não quebra o cupom).

### Impressão silenciosa (sem janela de impressão a cada senha)
Inicie o navegador do totem em modo quiosque com impressão direta:
```bash
# Windows
chrome.exe --kiosk --kiosk-printing "http://192.168.1.50:3000/totem"
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --kiosk --kiosk-printing "http://192.168.1.50:3000/totem"
```
Defina a impressora térmica como **padrão** do sistema e, nas preferências dela, o tamanho do papel (58/80 mm) e *corte automático*.

Observações: se o navegador bloquear pop-ups, o sistema usa um iframe oculto automaticamente. Para o totem, libere pop-ups do endereço do servidor.

## Quiosque em tablets
- **iPad**: *Ajustes → Acessibilidade → Acesso Guiado* (trava o Safari no totem).
- **Android**: *Fully Kiosk Browser* ou fixação de tela.
- Deixe o tablet na tomada e desative o bloqueio automático de tela.
