// Aplicativo da Fila Presencial para Windows, macOS e Linux (Electron).
// Sobe o mesmo servidor Node + SQLite do "npm start" dentro do app e abre a Recepção numa janela.
// A TV, o totem e os consultórios continuam abrindo pelo navegador, pelo IP deste computador.
const { app, BrowserWindow, Menu, Tray, Notification, clipboard, dialog, nativeImage, shell } = require('electron');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PORT = Number(process.env.PORT) || 3000;
const URL_LOCAL = `http://localhost:${PORT}`;
const ICONE = path.join(__dirname, 'icon.png');

// Os dados ficam fora do aplicativo (que é somente leitura depois de instalado) e sobrevivem a atualizações:
//   Windows %APPDATA%\Fila Presencial\dados · macOS ~/Library/Application Support/Fila Presencial/dados
//   Linux ~/.config/Fila Presencial/dados
app.setName('Fila Presencial');
if (!process.env.DATA_DIR) process.env.DATA_DIR = path.join(app.getPath('userData'), 'dados');
process.env.NODE_ENV = 'production';

let janela = null;
let bandeja = null;
let saindo = false;
let avisouBandeja = false;

// Uma única cópia aberta: duas tentariam usar a mesma porta e o mesmo banco.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => mostrarJanela());
  app.whenReady().then(iniciar);
}

const ipsDaRede = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);

const enderecoRede = (rota = '') => `http://${ipsDaRede()[0] || 'localhost'}:${PORT}${rota}`;

function portaLivre() {
  return new Promise((resolve) => {
    const teste = net.createServer();
    teste.once('error', () => resolve(false));
    teste.once('listening', () => teste.close(() => resolve(true)));
    teste.listen(PORT, '0.0.0.0');
  });
}

function filaRespondendo() {
  return new Promise((resolve) => {
    const req = http.get(`${URL_LOCAL}/api/health`, { timeout: 1500 }, (res) => {
      let corpo = '';
      res.on('data', (c) => (corpo += c));
      res.on('end', () => {
        try {
          resolve(res.statusCode === 200 && JSON.parse(corpo).ok === true);
        } catch {
          resolve(false);
        }
      });
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(false));
  });
}

async function aguardarServidor(tentativas = 50) {
  for (let i = 0; i < tentativas; i++) {
    if (await filaRespondendo()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function iniciar() {
  montarMenu();

  if (await portaLivre()) {
    try {
      await import(pathToFileURL(path.join(__dirname, 'server', 'index.js')).href);
    } catch (err) {
      dialog.showErrorBox('Fila Presencial', `Não foi possível iniciar o servidor da fila.\n\n${err?.stack || err}`);
      app.exit(1);
      return;
    }
  } else if (await filaRespondendo()) {
    // Já existe uma fila rodando neste computador (ex.: iniciar.bat): só abre a janela conectada a ela.
    dialog.showMessageBoxSync({
      type: 'info',
      title: 'Fila Presencial',
      message: 'A fila já está funcionando neste computador.',
      detail: `Outra cópia do sistema está usando a porta ${PORT} (por exemplo, o iniciar.bat ou o iniciar.command). Esta janela vai se conectar a ela.`,
    });
  } else {
    dialog.showErrorBox(
      'Fila Presencial',
      `A porta ${PORT} já está em uso por outro programa.\n\nFeche esse programa e abra a Fila Presencial de novo.`,
    );
    app.exit(1);
    return;
  }

  if (!(await aguardarServidor())) {
    dialog.showErrorBox('Fila Presencial', 'O servidor da fila não respondeu. Feche e abra o aplicativo de novo.');
    app.exit(1);
    return;
  }

  criarBandeja();
  criarJanela();
}

function criarJanela() {
  janela = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 650,
    title: 'Fila Presencial',
    icon: ICONE,
    backgroundColor: '#ffffff',
    show: false,
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  janela.loadURL(`${URL_LOCAL}/`);
  janela.once('ready-to-show', () => janela.show());

  // Dentro da janela, só o próprio sistema. Qualquer outro link abre no navegador padrão.
  const ehDaFila = (url) => url.startsWith(`${URL_LOCAL}/`) || url === URL_LOCAL;
  const abrirFora = (url) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  };
  janela.webContents.setWindowOpenHandler(({ url }) => {
    abrirFora(url);
    return { action: 'deny' };
  });
  janela.webContents.on('will-navigate', (evento, url) => {
    if (!ehDaFila(url)) {
      evento.preventDefault();
      abrirFora(url);
    }
  });

  // Fechar a janela não desliga a fila: TV, totem e consultórios dependem deste computador.
  janela.on('close', (evento) => {
    if (saindo) return;
    evento.preventDefault();
    janela.hide();
    if (!avisouBandeja && Notification.isSupported()) {
      avisouBandeja = true;
      new Notification({
        title: 'A fila continua funcionando',
        body:
          process.platform === 'darwin'
            ? 'Para voltar, clique no ícone da Fila no Dock. Para desligar, use Fila Presencial → Encerrar.'
            : 'Para voltar, abra a Fila Presencial de novo ou use o ícone perto do relógio. Para desligar, escolha Encerrar a fila.',
        icon: ICONE,
      }).show();
    }
  });
  janela.on('closed', () => (janela = null));
}

function mostrarJanela() {
  if (!janela) return criarJanela();
  if (janela.isMinimized()) janela.restore();
  janela.show();
  janela.focus();
}

function mostrarEnderecos() {
  const ips = ipsDaRede();
  const linhas = [
    ['Telão da TV', '/tv'],
    ['Totem', '/totem'],
    ['Consultório', '/chamar'],
    ['Recepção', '/'],
  ].map(([nome, rota]) => `${nome}: ${enderecoRede(rota)}`);
  const detalhe = ips.length
    ? `${linhas.join('\n')}\n\nOs aparelhos precisam estar na mesma rede (Wi-Fi ou cabo) deste computador.` +
      (ips.length > 1 ? `\nOutros IPs deste computador: ${ips.slice(1).join(', ')}` : '')
    : 'Este computador não está conectado a nenhuma rede. Conecte ao Wi-Fi ou cabo da clínica.';
  const escolha = dialog.showMessageBoxSync({
    type: 'info',
    title: 'Conectar TV, totem e consultórios',
    message: 'Abra estes endereços no navegador de cada aparelho:',
    detail: detalhe,
    buttons: ips.length ? ['Copiar endereço da TV', 'Fechar'] : ['Fechar'],
    defaultId: 0,
    cancelId: ips.length ? 1 : 0,
  });
  if (ips.length && escolha === 0) clipboard.writeText(enderecoRede('/tv'));
}

function confirmarSaida() {
  const escolha = dialog.showMessageBoxSync({
    type: 'warning',
    title: 'Encerrar a fila',
    message: 'Encerrar a Fila Presencial?',
    detail: 'A TV, o totem e os consultórios param de funcionar até você abrir o aplicativo de novo. Os dados ficam guardados.',
    buttons: ['Encerrar', 'Cancelar'],
    defaultId: 1,
    cancelId: 1,
  });
  if (escolha === 0) {
    saindo = true;
    app.quit();
  }
}

function itensDaFila() {
  return [
    { label: 'Abrir a Recepção', click: mostrarJanela },
    { label: 'Abrir no navegador', click: () => shell.openExternal(`${URL_LOCAL}/`) },
    { label: 'Conectar TV, totem e consultórios…', click: mostrarEnderecos },
    { type: 'separator' },
    { label: 'Ajuda', click: () => shell.openExternal(`${URL_LOCAL}/ajuda/`) },
    { label: 'Abrir a pasta dos dados', click: () => shell.openPath(process.env.DATA_DIR) },
  ];
}

function montarMenu() {
  const mac = process.platform === 'darwin';
  const modelo = [
    ...(mac ? [{ role: 'appMenu', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { label: 'Encerrar a fila', accelerator: 'Cmd+Q', click: confirmarSaida }] }] : []),
    {
      label: 'Fila',
      submenu: [...itensDaFila(), ...(mac ? [] : [{ type: 'separator' }, { label: 'Encerrar a fila', click: confirmarSaida }])],
    },
    { role: 'editMenu', label: 'Editar' },
    {
      label: 'Exibir',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamanho normal' },
        { role: 'zoomIn', label: 'Aumentar' },
        { role: 'zoomOut', label: 'Diminuir' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tela cheia' },
        { role: 'toggleDevTools', label: 'Ferramentas do técnico' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(modelo));
}

function criarBandeja() {
  const tamanho = process.platform === 'darwin' ? 18 : 24;
  const imagem = nativeImage.createFromPath(ICONE).resize({ width: tamanho, height: tamanho });
  bandeja = new Tray(imagem);
  bandeja.setToolTip(`Fila Presencial · ${enderecoRede()}`);
  bandeja.setContextMenu(
    Menu.buildFromTemplate([...itensDaFila(), { type: 'separator' }, { label: 'Encerrar a fila', click: confirmarSaida }]),
  );
  // No Windows, clique simples no ícone abre a janela (no macOS e Linux o clique abre o menu).
  bandeja.on('click', () => {
    if (process.platform === 'win32') mostrarJanela();
  });
}

// macOS: clicar no ícone do Dock traz a janela de volta.
app.on('activate', () => mostrarJanela());
// Saída pelo sistema (desligar o computador, Cmd+Q confirmado, Encerrar) não deve ser barrada pela janela.
app.on('before-quit', () => (saindo = true));
// A janela fica escondida em vez de fechada; o app só termina por "Encerrar a fila".
app.on('window-all-closed', () => {});
