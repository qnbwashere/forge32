'use strict';
/*
 * NovaESP desktop shell.
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

/* Rebranded from FORGE32 -- new installs get ~/NovaESP, but anyone
   updating who already has sketches in ~/Forge32 keeps using that folder
   rather than the app silently "losing" them behind a new, empty one. */
function sketchbookDir() {
  const novaDir = path.join(os.homedir(), 'NovaESP');
  const legacyDir = path.join(os.homedir(), 'Forge32');
  if (!fs.existsSync(novaDir) && fs.existsSync(legacyDir)) return legacyDir;
  return novaDir;
}

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
    // second instance of NovaESP that immediately quits (single instance
    // lock) and the real server never starts.
    ELECTRON_RUN_AS_NODE: '1',
    FORGE32_PORT: String(port),
    FORGE32_SKETCHBOOK: sketchbookDir(),
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
        'NovaESP stopped',
        'The build service exited unexpectedly. Reopen NovaESP to restart it.\n\n' + reason
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
 * Windows even unsigned. On macOS, Squirrel.Mac validates the new
 * package's code signature before it will install it, and this build is
 * ad hoc signed (identity: null) rather than signed with a real Apple
 * Developer ID -- ad hoc signatures aren't stable across builds, so that
 * validation can never reliably pass here. Real silent updates on macOS
 * would need paid Apple code signing plus notarization; treat this
 * platform's silent path as best effort, not a guarantee.
 *
 * Fallback path: a plain HTTPS GET against the GitHub releases API,
 * compared against app.getVersion(). This runs regardless of whether the
 * primary path found anything, purely so the user is never left in the
 * dark if the silent path silently fails to find/apply an update. It
 * only ever shows a "here's the direct download" dialog -- it never
 * downloads or installs anything itself, so it has no signing
 * requirement to fail against.
 *
 * Everything here also writes to a small log file (userData/update.log)
 * because the previous version of this code had no way to tell *why* a
 * check produced nothing -- next time this is reported, that log is the
 * first thing to check instead of guessing again.
 */

function updateLog(line) {
  try {
    const p = path.join(app.getPath('userData'), 'update.log');
    const stamp = new Date().toISOString();
    fs.appendFileSync(p, `[${stamp}] ${line}\n`);
    // keep it small
    const text = fs.readFileSync(p, 'utf8');
    if (text.length > 50000) fs.writeFileSync(p, text.slice(-30000));
  } catch { /* logging must never be why the app breaks */ }
}

let fallbackCheckInFlight = false;
let fallbackSucceeded = false;

function compareVersions(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0, nb = pb[i] || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

function pickAssetName() {
  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? 'NovaESP-mac-arm64.dmg' : 'NovaESP-mac-x64.dmg';
  }
  if (process.platform === 'win32') return 'NovaESP-win-x64.exe';
  return null;
}

/* GitHub asset URLs 302 to S3/Azure, so this has to follow redirects
   itself -- https.get doesn't. */
function downloadToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const cleanupAndReject = (e) => { file.close(); fs.unlink(destPath, () => {}); reject(e); };
    const request = (u) => {
      https.get(u, { headers: { 'User-Agent': 'NovaESP-updater' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return request(res.headers.location);
        }
        if (res.statusCode !== 200) return cleanupAndReject(new Error('HTTP ' + res.statusCode));
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      }).on('error', cleanupAndReject);
    };
    request(url);
  });
}

/* Real silent replacement needs a signature Squirrel.Mac can verify
   against the previous build, which an ad hoc signature (see SETUP.md)
   can't provide -- there's no way around that without a paid Apple
   Developer ID cert. This is the next best thing: instead of "Download"
   opening a GitHub release page the user has to search for the right file
   on, fetch the exact asset for this platform/arch and open it directly
   -- a mounted .dmg or a launched installer is one drag/click away,
   rather than several. */
async function downloadAndOpenUpdate(json) {
  const releasePage = json.html_url || 'https://github.com/qnbwashere/forge32/releases/latest';
  const assetName = pickAssetName();
  const asset = assetName && (json.assets || []).find((a) => a.name === assetName);
  if (!asset) {
    updateLog(`fallback: no matching asset (${assetName}) in release yet, opening release page instead`);
    shell.openExternal(releasePage);
    return;
  }
  const dest = path.join(os.tmpdir(), asset.name);
  updateLog(`fallback: downloading ${asset.name}`);
  try {
    await downloadToFile(asset.browser_download_url, dest);
    updateLog(`fallback: downloaded to ${dest}, opening`);
    shell.openPath(dest); // mounts the dmg in Finder, or launches the exe installer
  } catch (e) {
    updateLog(`fallback: download failed (${e.message}), opening release page instead`);
    shell.openExternal(releasePage);
  }
}

function checkForUpdatesFallback() {
  if (fallbackCheckInFlight || fallbackSucceeded) return;
  fallbackCheckInFlight = true;
  updateLog('fallback: checking api.github.com/repos/qnbwashere/forge32/releases/latest');
  const req = https.get(
    {
      host: 'api.github.com',
      path: '/repos/qnbwashere/forge32/releases/latest',
      headers: { 'User-Agent': 'NovaESP-updater' },
      timeout: 8000,
    },
    (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        fallbackCheckInFlight = false;
        if (res.statusCode !== 200) {
          // rate limited or otherwise blocked -- log it instead of silently
          // treating "couldn't check" the same as "no update available"
          updateLog(`fallback: HTTP ${res.statusCode} from GitHub, giving up for this launch: ${data.slice(0, 300)}`);
          return;
        }
        try {
          const json = JSON.parse(data);
          const latest = String(json.tag_name || '').trim();
          if (!latest) { updateLog('fallback: response had no tag_name'); return; }
          updateLog(`fallback: latest is ${latest}, running ${app.getVersion()}`);
          if (compareVersions(latest, app.getVersion()) > 0) {
            fallbackSucceeded = true;
            dialog.showMessageBox(win, {
              type: 'info',
              title: 'NovaESP update available',
              message: `NovaESP ${latest} is available (you have ${app.getVersion()}).`,
              detail: 'Automatic updates on this platform may not have applied yet. Download fetches and opens the installer for you -- just drag it in (Mac) or run it through (Windows).',
              buttons: ['Download', 'Later'],
              defaultId: 0,
              cancelId: 1,
            }).then((r) => {
              if (r.response === 0) downloadAndOpenUpdate(json);
            });
          }
        } catch (e) { updateLog(`fallback: could not parse GitHub response: ${e.message}`); }
      });
    }
  );
  req.on('timeout', () => { fallbackCheckInFlight = false; updateLog('fallback: request timed out'); req.destroy(); });
  req.on('error', (e) => { fallbackCheckInFlight = false; updateLog(`fallback: request failed: ${e.message}`); });
}

function checkForUpdates() {
  if (!app.isPackaged) return; // dev runs have no publish feed to check

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => updateLog('electron-updater: checking'));
  autoUpdater.on('update-available', (info) => updateLog(`electron-updater: update available, ${info && info.version}`));
  autoUpdater.on('update-not-available', (info) => updateLog(`electron-updater: no update, latest is ${info && info.version}`));

  autoUpdater.on('update-downloaded', () => {
    fallbackSucceeded = true; // the real updater clearly worked, skip the fallback nag
    updateLog('electron-updater: downloaded, prompting to restart');
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'NovaESP update ready',
      message: 'A new version of NovaESP has been downloaded.',
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

  autoUpdater.on('error', (e) => {
    // silent path failed (expected on this ad hoc signed mac build) --
    // fall back to a manual notification so the user still finds out.
    updateLog(`electron-updater: error: ${e && (e.stack || e.message || e)}`);
    checkForUpdatesFallback();
  });

  autoUpdater.checkForUpdates().catch((e) => {
    // already logged and handled via the 'error' event above; this catch
    // exists purely so the rejected promise doesn't surface as an
    // unhandled rejection warning.
    updateLog(`electron-updater: checkForUpdates rejected: ${e && (e.message || e)}`);
  });

  // Insurance: run the fallback check unconditionally a bit later too, in
  // case the primary updater neither errors nor finds anything wrong but
  // also never actually applies (observed Squirrel.Mac behavior on
  // unsigned builds). checkForUpdatesFallback() is a no-op once it's
  // already found and shown something this launch.
  setTimeout(checkForUpdatesFallback, 15000);
}

// A single check at launch only catches updates that existed before the
// user opened the app. Re-check periodically too, so a session left
// running for a while still notices a release that shipped after launch.
function scheduleRecurringUpdateChecks() {
  setInterval(() => {
    fallbackSucceeded = false;
    checkForUpdates();
  }, 2 * 60 * 60 * 1000); // every 2 hours
}

/* ---------------------------------------------------------------- */

function menu() {
  const mac = process.platform === 'darwin';
  const template = [
    ...(mac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Open sketchbook folder', click: () => shell.openPath(sketchbookDir()) },
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
    title: 'NovaESP',
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
      scheduleRecurringUpdateChecks();
    } catch (err) {
      dialog.showErrorBox('NovaESP could not start', String(err && err.message ? err.message : err));
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
