const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

// 1. Hardware acceleration & rendering
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-smooth-scrolling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = 3001;
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`;

// 2. Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// 3. Database and distribution path resolution
const isPackaged = app.isPackaged;
const userDataPath = app.getPath('userData');

if (!fs.existsSync(userDataPath)) {
  try {
    fs.mkdirSync(userDataPath, { recursive: true });
  } catch (e) {}
}

const userDbPath = path.join(userDataPath, 'leads.db');
const bundledDbPath = isPackaged
  ? path.join(__dirname, '..', 'server', 'leads.db')
  : path.resolve(__dirname, '..', 'server', 'leads.db');

if (!fs.existsSync(userDbPath) && fs.existsSync(bundledDbPath)) {
  try {
    fs.copyFileSync(bundledDbPath, userDbPath);
  } catch (e) {}
}

const activeDbPath = fs.existsSync(userDbPath) ? userDbPath : bundledDbPath;
const clientDistPath = isPackaged
  ? path.join(__dirname, '..', 'client', 'dist')
  : path.resolve(__dirname, '..', 'client', 'dist');

const serverScriptPath = isPackaged
  ? path.join(__dirname, '..', 'server', 'dist', 'index.js')
  : path.resolve(__dirname, '..', 'server', 'dist', 'index.js');

// 4. Start backend using Electron internal Node runtime
function startBackendServer() {
  console.log('[Desktop App] Starting backend server from:', serverScriptPath);
  
  serverProcess = spawn(process.execPath, [serverScriptPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(SERVER_PORT),
      DATABASE_PATH: activeDbPath,
      CLIENT_DIST_PATH: clientDistPath,
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (d) => {
      console.log('[Server]', d.toString().trim());
    });
  }

  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (d) => {
      console.error('[Server Error]', d.toString().trim());
    });
  }

  serverProcess.on('exit', (code) => {
    console.log('[Desktop App] Server process exited with code:', code);
  });
}

// 5. Health check loop
function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`${url}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.setTimeout(800, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Server timeout'));
      } else {
        setTimeout(check, 250);
      }
    };

    check();
  });
}

// 6. Create Native Desktop Browser Window
function createWindow() {
  const iconPath = path.join(__dirname, 'icon.ico');
  const fallbackIcon = path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0B0F17',
    icon: fs.existsSync(iconPath) ? iconPath : fallbackIcon,
    title: 'OutreachAI — Lead Generation & Outreach Engine',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:') || url.startsWith('whatsapp:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(SERVER_URL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(SERVER_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 7. Lifecycle management
app.whenReady().then(async () => {
  try {
    startBackendServer();
    await waitForServer(SERVER_URL);
    createWindow();
  } catch (err) {
    console.error('[Desktop App] Error:', err);
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

function cleanup() {
  if (serverProcess) {
    try {
      serverProcess.kill('SIGINT');
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
      }
    } catch (e) {}
    serverProcess = null;
  }
}

app.on('before-quit', cleanup);
app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
