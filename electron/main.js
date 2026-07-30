'use strict';
/*
 * FORGE32 desktop shell.
 * Boots the local IDE server as a child process, waits for it to answer,
 * then opens a window on it. The bundled arduino-cli is handed to the
 * server through FORGE32_CLI so the user never installs a toolchain.
 */

const { app, BrowserWindow, shell, dialog, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const http = require('node:http');
const { fork } = require('node:child_process');

const PACKAGED = app.isPackaged;
const RES = PACKAGED ? process.resourcesPath : path.join(__dirname, '..');
const IDE_DIR = PACKAGED ? path.join(RES, 'ide') : path.join(RES, 'app');
const BIN_DIR = PACKAGED ? path.join(RES, 'bin') : path.join(RES, 'bin');
const CLI_EXE = process.platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli';

let child = null;
let win = null;
let port = 0;

/* ---------------------------------------------------------------- */

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}

function waitForServer(p, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(
        { host: '127.0.0.1', port: p, path: '/api/status', timeout: 1500 },
        (res) => { res.resume(); resolve(true); }
      );
      req.on('error', retry);
      req.on('timeout', () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() > deadline) return reject(new Error('server did not start'));
      setTimeout(tick, 250);
    };
    tick();
  });
}

function startServer() {
  const entry = path.join(IDE_DIR, 'server.js');
  if (!fs.existsSync(entry)) throw new Error('missing IDE server at ' + entry);

  const cli = path.join(BIN_DIR, CLI_EXE);
  const env = Object.assign({}, process.env, {
    FORGE32_PORT: String(port),
    FORGE32_SKETCHBOOK: path.join(os.homedir(), 'Forge32'),
  });
  if (fs.existsSync(cli)) {
    // make sure the shipped binary is executable (dmg/zip can drop the bit)
    if (process.platform !== 'win32') {
      try { fs.chmodSync(cli, 0o755); } catch { /* non fatal */ }
    }
    env.FORGE32_CLI = cli;
  }

  child = fork(entry, [], {
    cwd: IDE_DIR,
    env,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  child.stdout.on('data', (d) => process.stdout.write('[ide] ' + d));
  child.stderr.on('data', (d) => process.stderr.write('[ide] ' + d));
  child.on('exit', (code) => {
    child = null;
    if (!app.isQuitting && code !== 0) {
      dialog.showErrorBox('FORGE32 stopped', 'The build service exited unexpectedly. Reopen FORGE32 to restart it.');
    }
  });
}

function stopServer() {
  if (!child) return;
  try { child.kill(); } catch { /* already gone */ }
  child = null;
}

/* ---------------------------------------------------------------- */

function menu() {
  const mac = process.platform === 'darwin';
  const template = [
    ...(mac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Open sketchbook folder', click: () => shell.openPath(path.join(os.homedir(), 'Forge32')) },
        { type: 'separator' },
        mac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1040,
    minHeight: 660,
    backgroundColor: '#10161c',
    show: false,
    title: 'FORGE32',
    autoHideMenuBar: process.platform === 'win32',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  win.once('ready-to-show', () => win.show());

  // external links open in the real browser, not in the app frame
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  await win.loadURL(`http://127.0.0.1:${port}/`);
}

/* ---------------------------------------------------------------- */

app.isQuitting = false;

// one instance only, otherwise two servers fight over the sketchbook
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { win.show(); win.focus(); }
  });

  app.whenReady().then(async () => {
    try {
      port = await freePort();
      startServer();
      await waitForServer(port);
      menu();
      await createWindow();
    } catch (err) {
      dialog.showErrorBox('FORGE32 could not start', String(err && err.message ? err.message : err));
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('before-quit', () => { app.isQuitting = true; stopServer(); });
  app.on('will-quit', stopServer);
  process.on('exit', stopServer);
}
