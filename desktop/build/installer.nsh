; Libera a Fila Presencial no Firewall do Windows (redes privadas e de domínio) durante a instalação,
; para a TV, o totem e os consultórios conseguirem abrir o endereço sem a pergunta do Firewall.
; Nunca libera redes públicas. A regra é removida na desinstalação.

!macro customInstall
  nsExec::Exec 'netsh advfirewall firewall delete rule name="Fila Presencial"'
  nsExec::Exec 'netsh advfirewall firewall add rule name="Fila Presencial" dir=in action=allow program="$INSTDIR\${APP_EXECUTABLE_FILENAME}" enable=yes profile=private,domain'
!macroend

!macro customUnInstall
  nsExec::Exec 'netsh advfirewall firewall delete rule name="Fila Presencial"'
!macroend
