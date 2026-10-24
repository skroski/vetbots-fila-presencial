// Ponto de entrada do aplicativo Electron (Desktop nativo para Windows e Mac).
// Inicia o servidor Node embutido e abre a janela com a Recepção.
const { app, BrowserWindow, shell, Tray, Menu } = require('electron');
const path = require('node:path');
const http = require('node:http');

const PORT = process.env.PORT || 3000;
let mainWindow = null;
let tray = null;

// Sobe o servidor Express da aplicação em segundo plano
async function iniciarServidor() {
  process.env.NODE_ENV = 'production';
  try {
    // Importa o index do servidor
    await import('../server/index.js');
  } catch (err) {
    console.error('Erro ao inicializar o servidor interno:', err);
  }
}

function aguardarServidorPronto(tentativas = 30) {
  return new Promise((resolve) => {
    const checar = (restantes) => {
      if (restantes <= 0) return resolve();
      const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
        if (res.statusCode === 200) resolve();
        else setTimeout(() => checar(restantes - 1), 300);
      });
      req.on('error', () => {
        setTimeout(() => checar(restantes - 1), 300);
      });
      req.end();
    };
    checar(tentativas);
  });
}

async function criarJanela() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 650,
    title: 'VetBots · Fila Presencial',
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${PORT}/`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Links externos ou target="_blank" abrem no navegador padrão do sistema (Chrome/Safari/Edge)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await iniciarServidor();
  await aguardarServidorPronto();
  await criarJanela();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
