#!/bin/bash
# Duplo clique no macOS (ou ./iniciar.command no Linux): instala se preciso e inicia.
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
exec node server/index.js
