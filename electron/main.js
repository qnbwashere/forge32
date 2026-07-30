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
const https = require('node:https');
const { fork } = require('node:child_process');
const { autoUpdater } = require('electron-updater');

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
    // Without this, fork() re-launches the packaged Electron binary itself
    // rather than running server.js as plain Node, so the "child" is just a
    // second instance of FORGE32 that immediately quits (single instance
    // lock) and the real server never starts.
    ELECTRON_RUN_AS_NODE: '1',
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
  // keep the tail of stderr around so a crash dialog can say why, not just that
  let lastErr = '';
  child.stdout.on('data', (d) => process.stdout.write('[ide] ' + d));
  child.stderr.on('data', (d) => {
    process.stderr.write('[ide] ' + d);
    lastErr = (lastErr + d.toString()).slice(-2000);
  });
  child.on('error', (e) => { lastErr = (lastErr + '\n' + e.message).slice(-2000); });
  child.on('exit', (code, signal) => {
    child = null;
    if (!app.isQuitting && code !== 0) {
      const reason = lastErr.trim() || `no output captured (exit code ${code}${signal ? ', signal ' + signal : ''})`;
      dialog.showErrorBox(
        'FORGE32 stopped',
        'The build service exited unexpectedly. Reopen FORGE32 to restart it.\n\n' + reason
      );
    }
  });
}

function stopServer() {
  if (!child) return;
  try { child.kill(); } catch { /* already gone */ }
  child = null;
}

/* ---------------------------------------------------------------- */
/* Auto-update.
 *
 * Primary path: electron-updater, pointed at GitHub releases via the
 * `publish` block in electron-builder.yml. This is the real silent
 * updater (NSIS on Windows, Squirrel.Mac on macOS) and works reliably on
 * Windows even unsigned. On macOS, Squirrel.Mac's silent update is only
 * reliable for signed/notarized apps; this build is ad hoc signed only,
 * so treat it as best effort there, not a guarantee.
 *
 * Fallback path: a plain HTTPS GET against the GitHub releases API,
 * compared against app.getVersion(). This runs regardless of whether the
 * primary path found anything, purely so the user is never left in the
 * dark if the silent path silently fails to find/apply an update on an
 * unsigned mac build. It only ever shows a "here's the direct download"
 * dialog -- it never downloads or installs anything itself.
 */

let fallbackCheckDone = false;

function compareVersions(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0, nb = pb[i] || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

function checkForUpdatesFallback() {
  if (fallbackCheckDone) return;
  fallbackCheckDone = true;
  const req = https.get(
    {
      host: 'api.github.com',
      path: '/repos/qnbwashere/forge32/releases/latest',
      headers: { 'User-Agent': 'FORGE32-updater' },
      timeout: 8000,
    },
    (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const latest = String(json.tag_name || '').trim();
          if (!latest) return;
          if (compareVersions(latest, app.getVersion()) > 0) {
            const url = json.html_url || 'https://github.com/qnbwashere/forge32/releases/latest';
            dialog.showMessageBox(win, {
              type: 'info',
              title: 'FORGE32 update available',
              message: `FORGE32 ${latest} is available (you have ${app.getVersion()}).`,
              detail: 'Automatic updates on this platform may not have applied yet. Click Download to get it directly.',
              buttons: ['Download', 'Later'],
              defaultId: 0,
              cancelId: 1,
            }).then((r) => {
              if (r.response === 0) shell.openExternal(url);
            });
          }
        } catch { /* malformed response, ignore */ }
      });
    }
  );
  req.on('timeout', () => req.destroy());
  req.on('error', () => { /* offline or blocked, ignore */ });
}

function checkForUpdates() {
  if (!app.isPackaged) return; // dev runs have no publish feed to check

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', () => {
    fallbackCheckDone = true; // the real updater clearly worked, skip the fallback nag
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'FORGE32 update ready',
      message: 'A new version of FORGE32 has been downloaded.',
      detail: 'Restart now to install it, or it will install the next time you quit.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then((r) => {
      if (r.response === 0) {
        app.isQuitting = true;
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', () => {
    // silent path failed (common on an unsigned mac build) -- fall back
    // to a manual notification so the user still finds out.
    checkForUpdatesFallback();
  });

  try {
    autoUpdater.checkForUpdates();
  } catch {
    checkForUpdatesFallback();
  }

  // Insurance: run the fallback check unconditionally a bit later too, in
  // case the primary updater neither errors nor finds anything wrong but
  // also never actually applies (observed Squirrel.Mac behavior on
  // unsigned builds). checkForUpdatesFallback() is idempotent per launch.
  setTimeout(checkForUpdatesFallback, 15000);
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
      checkForUpdates();
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
