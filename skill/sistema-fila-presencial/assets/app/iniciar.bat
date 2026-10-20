@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Fila Presencial
if not exist node_modules (
  echo Primeira vez: instalando... aguarde.
  call npm install
)
echo.
echo Iniciando a Fila Presencial. Nao feche esta janela enquanto a clinica estiver em uso.
echo.
node server\index.js
pause
