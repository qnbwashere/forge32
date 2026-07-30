#!/usr/bin/env node
/*
 * FORGE32 backend
 * A zero dependency Node server that wraps arduino-cli so the browser IDE can
 * really compile and really flash an ESP32. Binds to loopback only.
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn, execFile } = require('node:child_process');

const PORT = Number(process.env.FORGE32_PORT || 4032);
const HOST = '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const SKETCHBOOK = process.env.FORGE32_SKETCHBOOK || path.join(os.homedir(), 'Forge32');
const ESP32_INDEX = 'https://espressif.github.io/arduino-esp32/package_esp32_index.json';

/* ------------------------------------------------------------------ */
/* locating arduino-cli                                                */
/* ------------------------------------------------------------------ */

let CLI = null;
let CLI_VERSION = null;
let MOCK = process.argv.includes('--mock');

function candidatePaths() {
  const exe = process.platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli';
  const list = [];
  if (process.env.FORGE32_CLI) list.push(process.env.FORGE32_CLI);
  list.push(path.join(__dirname, 'bin', exe));
  list.push(path.join(__dirname, exe));
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (dir) list.push(path.join(dir, exe));
  }
  list.push('/usr/local/bin/' + exe, '/opt/homebrew/bin/' + exe,
            path.join(os.homedir(), 'bin', exe),
            path.join(os.homedir(), '.local', 'bin', exe));
  return list;
}

function findCli() {
  for (const p of candidatePaths()) {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      const st = fs.statSync(p);
      if (st.isFile()) return p;
    } catch { /* keep looking */ }
  }
  return null;
}

function cliVersion(bin) {
  return new Promise((resolve) => {
    execFile(bin, ['version', '--format', 'json'], { timeout: 15000 }, (err, stdout) => {
      if (err) return resolve(null);
      try { resolve(JSON.parse(stdout).VersionString || null); } catch { resolve(null); }
    });
  });
}

/* ------------------------------------------------------------------ */
/* running the cli                                                     */
/* ------------------------------------------------------------------ */

/** Run arduino-cli and buffer the whole result. */
function run(args, opts = {}) {
  return new Promise((resolve) => {
    if (!CLI) return resolve({ code: -1, out: '', err: 'arduino-cli not found', ok: false });
    const child = spawn(CLI, args, { env: process.env });
    let out = '', err = '';
    const timer = setTimeout(() => { try { child.kill(); } catch {} },
      opts.timeout || 15 * 60 * 1000);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, out, err: String(e.message), ok: false }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out, err, ok: code === 0 }); });
  });
}

/** Run arduino-cli with --format json and parse, tolerating warning noise. */
async function runJson(args, opts) {
  const r = await run([...args, '--format', 'json'], opts);
  let data = null;
  const text = r.out.trim();
  if (text) {
    try { data = JSON.parse(text); }
    catch {
      const start = text.search(/[[{]/);
      if (start >= 0) { try { data = JSON.parse(text.slice(start)); } catch {} }
    }
  }
  return { ...r, data };
}

/* ------------------------------------------------------------------ */
/* streaming helpers (newline delimited JSON over a POST response)      */
/* ------------------------------------------------------------------ */

function openStream(res) {
  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store, no-transform',
    'X-Accel-Buffering': 'no',
    'Connection': 'keep-alive',
  });
  let closed = false;
  return {
    send(obj) {
      if (closed) return;
      try { res.write(JSON.stringify(obj) + '\n'); } catch { closed = true; }
    },
    end(obj) {
      if (closed) return;
      if (obj) this.send(obj);
      closed = true;
      try { res.end(); } catch {}
    },
    get closed() { return closed; },
    markClosed() { closed = true; },
  };
}

/** Spawn the cli and stream every line to the browser as it happens. */
function stream(stm, args, { onLine, label } = {}) {
  return new Promise((resolve) => {
    if (!CLI) { stm.send({ t: 'err', line: 'arduino-cli not found.' }); return resolve(-1); }
    stm.send({ t: 'cmd', line: 'arduino-cli ' + args.join(' ') });
    const child = spawn(CLI, args, { env: process.env });
    let tail = { out: '', err: '' };
    const pump = (chunk, kind) => {
      tail[kind] += chunk;
      const parts = tail[kind].split(/\r?\n/);
      tail[kind] = parts.pop();
      for (const line of parts) {
        stm.send({ t: kind === 'out' ? 'out' : 'err', line });
        if (onLine) onLine(line);
      }
    };
    child.stdout.on('data', (d) => pump(String(d), 'out'));
    child.stderr.on('data', (d) => pump(String(d), 'err'));
    child.on('error', (e) => {
      stm.send({ t: 'err', line: 'Could not start arduino-cli: ' + e.message });
      resolve(-1);
    });
    child.on('close', (code) => {
      for (const kind of ['out', 'err']) {
        if (tail[kind]) {
          stm.send({ t: kind === 'out' ? 'out' : 'err', line: tail[kind] });
          if (onLine) onLine(tail[kind]);
        }
      }
      resolve(code);
    });
    stm.child = child;
    if (label) stm.label = label;
  });
}

/* ------------------------------------------------------------------ */
/* sketchbook                                                          */
/* ------------------------------------------------------------------ */

function safeSketchPath(rel) {
  const full = path.resolve(SKETCHBOOK, rel || '');
  const root = path.resolve(SKETCHBOOK);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error('Path is outside the sketchbook.');
  }
  return full;
}

const DEFAULT_SKETCH = `/*  Blink and talk
 *  Board: ESP32 Dev Module   Baud: 115200
 */

#define LED_PIN 2

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("FORGE32 online");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.printf("uptime: %lu ms\\n", millis());
  delay(500);
  digitalWrite(LED_PIN, LOW);
  delay(500);
}
`;

async function ensureSketchbook() {
  await fsp.mkdir(SKETCHBOOK, { recursive: true });
  const first = path.join(SKETCHBOOK, 'Blink', 'Blink.ino');
  try { await fsp.access(first); }
  catch {
    await fsp.mkdir(path.dirname(first), { recursive: true });
    await fsp.writeFile(first, DEFAULT_SKETCH, 'utf8');
  }
}

async function listSketches() {
  await ensureSketchbook();
  const out = [];
  let entries = [];
  try { entries = await fsp.readdir(SKETCHBOOK, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue;
    const dir = path.join(SKETCHBOOK, e.name);
    let files = [];
    try { files = await fsp.readdir(dir); } catch { continue; }
    const code = files.filter((f) => /\.(ino|cpp|c|h|hpp)$/i.test(f)).sort((a, b) => {
      const ap = a.toLowerCase() === (e.name + '.ino').toLowerCase() ? 0 : 1;
      const bp = b.toLowerCase() === (e.name + '.ino').toLowerCase() ? 0 : 1;
      return ap - bp || a.localeCompare(b);
    });
    if (!code.length) continue;
    let mtime = 0;
    try { mtime = (await fsp.stat(path.join(dir, code[0]))).mtimeMs; } catch {}
    out.push({ name: e.name, files: code, mtime });
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out;
}

/* ------------------------------------------------------------------ */
/* parsing compiler output                                             */
/* ------------------------------------------------------------------ */

const RE_DIAG = /^(.*?):(\d+):(?:(\d+):)?\s*(fatal error|error|warning|note):\s*(.*)$/;
const RE_FLASH = /Sketch uses (\d+) bytes \((\d+)%\).*?Maximum is (\d+) bytes/i;
const RE_RAM = /Global variables use (\d+) bytes \((\d+)%\).*?Maximum is (\d+) bytes/i;

function parseDiagnostics(lines, sketchDir) {
  const diags = [];
  const seen = new Set();
  for (const line of lines) {
    const m = RE_DIAG.exec(line.trim());
    if (!m) continue;
    let [, file, ln, col, sev, msg] = m;
    if (/^In file included from/.test(file)) continue;
    const base = path.basename(file);
    const key = base + ':' + ln + ':' + (col || '') + ':' + msg;
    if (seen.has(key)) continue;
    seen.add(key);
    diags.push({
      file: base,
      full: file,
      inSketch: sketchDir ? path.resolve(file).startsWith(path.resolve(sketchDir)) : false,
      line: Number(ln),
      column: col ? Number(col) : null,
      severity: sev === 'warning' ? 'warning' : sev === 'note' ? 'note' : 'error',
      message: msg.trim(),
    });
  }
  return diags;
}

function parseSizes(text) {
  const size = {};
  const f = RE_FLASH.exec(text);
  if (f) size.flash = { used: +f[1], pct: +f[2], max: +f[3] };
  const r = RE_RAM.exec(text);
  if (r) size.ram = { used: +r[1], pct: +r[2], max: +r[3] };
  return Object.keys(size).length ? size : null;
}

/* ------------------------------------------------------------------ */
/* board metadata                                                      */
/* ------------------------------------------------------------------ */

const FALLBACK_BOARDS = [
  ['esp32:esp32:esp32', 'ESP32 Dev Module'],
  ['esp32:esp32:esp32s3', 'ESP32-S3 Dev Module'],
  ['esp32:esp32:esp32s2', 'ESP32-S2 Dev Module'],
  ['esp32:esp32:esp32c3', 'ESP32-C3 Dev Module'],
  ['esp32:esp32:esp32c6', 'ESP32-C6 Dev Module'],
  ['esp32:esp32:esp32h2', 'ESP32-H2 Dev Module'],
  ['esp32:esp32:nodemcu-32s', 'NodeMCU-32S'],
  ['esp32:esp32:esp32doit-devkit-v1', 'DOIT ESP32 DEVKIT V1'],
  ['esp32:esp32:esp32wrover', 'ESP32 Wrover Module'],
  ['esp32:esp32:lolin32', 'WEMOS LOLIN32'],
  ['esp32:esp32:lolin_s3', 'WEMOS LOLIN S3'],
  ['esp32:esp32:featheresp32', 'Adafruit ESP32 Feather'],
  ['esp32:esp32:adafruit_feather_esp32s3', 'Adafruit Feather ESP32-S3'],
  ['esp32:esp32:adafruit_qtpy_esp32c3', 'Adafruit QT Py ESP32-C3'],
  ['esp32:esp32:XIAO_ESP32C3', 'Seeed XIAO ESP32C3'],
  ['esp32:esp32:XIAO_ESP32S3', 'Seeed XIAO ESP32S3'],
  ['esp32:esp32:ttgo-lora32', 'TTGO LoRa32-OLED'],
  ['esp32:esp32:ttgo-t1', 'TTGO T1'],
  ['esp32:esp32:heltec_wifi_kit_32', 'Heltec WiFi Kit 32'],
  ['esp32:esp32:m5stack_core_esp32', 'M5Stack Core ESP32'],
  ['esp32:esp32:m5stack_atom', 'M5Stack Atom'],
  ['esp32:esp32:esp32cam', 'AI Thinker ESP32-CAM'],
  ['esp32:esp32:esp32thing', 'SparkFun ESP32 Thing'],
  ['esp32:esp32:um_tinys3', 'UM TinyS3'],
].map(([fqbn, name]) => ({ fqbn, name }));

function chipOf(fqbn) {
  const t = (fqbn || '').split(':')[2] || '';
  const lower = t.toLowerCase();
  for (const c of ['esp32s3', 'esp32s2', 'esp32c6', 'esp32c3', 'esp32h2', 'esp32c2']) {
    if (lower.includes(c)) return c.toUpperCase().replace('ESP32', 'ESP32-');
  }
  if (/s3/.test(lower)) return 'ESP32-S3';
  if (/s2/.test(lower)) return 'ESP32-S2';
  if (/c6/.test(lower)) return 'ESP32-C6';
  if (/c3/.test(lower)) return 'ESP32-C3';
  if (/h2/.test(lower)) return 'ESP32-H2';
  return 'ESP32';
}

/* ------------------------------------------------------------------ */
/* mock data so the interface is usable before the toolchain exists     */
/* ------------------------------------------------------------------ */

const MOCK_LIBS = [
  ['Adafruit NeoPixel', '1.12.3', 'Adafruit', 'Control WS2812 and other addressable LEDs.'],
  ['FastLED', '3.7.8', 'FastLED', 'High performance addressable LED library.'],
  ['ArduinoJson', '7.2.0', 'Benoit Blanchon', 'Build and parse JSON without dynamic allocation surprises.'],
  ['PubSubClient', '2.8', 'Nick O\'Leary', 'MQTT publish and subscribe client.'],
  ['Adafruit SSD1306', '2.5.13', 'Adafruit', 'Driver for monochrome OLED displays.'],
  ['Adafruit GFX Library', '1.11.11', 'Adafruit', 'Shared graphics primitives for Adafruit displays.'],
  ['DHT sensor library', '1.4.6', 'Adafruit', 'Read DHT11 and DHT22 temperature and humidity sensors.'],
  ['OneWire', '2.3.8', 'Paul Stoffregen', 'Dallas 1-Wire bus protocol.'],
  ['DallasTemperature', '3.9.0', 'Miles Burton', 'DS18B20 temperature sensors.'],
  ['ESP32Servo', '3.0.6', 'Kevin Harrington', 'Servo control using the ESP32 LEDC peripheral.'],
  ['TFT_eSPI', '2.5.43', 'Bodmer', 'Fast SPI display driver for many TFT panels.'],
  ['WiFiManager', '2.0.17', 'tzapu', 'Captive portal for entering WiFi credentials.'],
  ['ESPAsyncWebServer', '3.4.0', 'ESP32Async', 'Asynchronous HTTP and WebSocket server.'],
  ['IRremote', '4.4.1', 'shirriff', 'Send and receive infrared remote codes.'],
  ['MPU6050', '1.4.1', 'Electronic Cats', 'Accelerometer and gyroscope driver.'],
  ['Adafruit BME280 Library', '2.2.4', 'Adafruit', 'Temperature, humidity and pressure sensor.'],
  ['NimBLE-Arduino', '1.4.2', 'h2zero', 'Lightweight BLE stack, much smaller than Bluedroid.'],
  ['Button2', '2.3.4', 'Lennart Hennigs', 'Debounced buttons with click, long press and double click.'],
  ['ESP32Encoder', '0.11.7', 'Kevin Harrington', 'Rotary encoder counting using the PCNT peripheral.'],
  ['Preferences', 'bundled', 'Espressif', 'Key value storage in flash. Included with the ESP32 core.'],
].map(([name, version, author, sentence]) => ({ name, version, author, sentence, installed: false }));

/* ------------------------------------------------------------------ */
/* api                                                                 */
/* ------------------------------------------------------------------ */

const monitors = new Map(); // port -> { child, stm }

function stopMonitor(port) {
  const m = monitors.get(port);
  if (!m) return false;
  monitors.delete(port);
  try { m.child.kill(); } catch {}
  try { m.stm.end({ t: 'closed', line: 'Monitor closed.' }); } catch {}
  return true;
}

function stopAllMonitors() {
  const ports = [...monitors.keys()];
  ports.forEach(stopMonitor);
  return ports;
}

const api = {

  async 'GET /api/status'() {
    const cores = CLI ? await runJson(['core', 'list']) : null;
    let esp32 = null;
    const plats = cores?.data?.platforms || [];
    for (const p of plats) {
      const id = p.id || p.metadata?.id || '';
      if (id === 'esp32:esp32') {
        const installed = p.installed_version || p.installed || null;
        esp32 = { installed, latest: p.latest_version || p.latest || installed };
      }
    }
    return {
      ok: true,
      cli: CLI, cliVersion: CLI_VERSION,
      mock: MOCK || !CLI,
      esp32,
      sketchbook: SKETCHBOOK,
      indexUrl: ESP32_INDEX,
      platform: process.platform,
      node: process.version,
    };
  },

  async 'GET /api/boards'() {
    if (!CLI) return { ok: true, boards: FALLBACK_BOARDS, source: 'builtin' };
    const r = await runJson(['board', 'listall']);
    const raw = r.data?.boards || [];
    const boards = raw
      .filter((b) => (b.fqbn || '').startsWith('esp32:esp32:'))
      .map((b) => ({ fqbn: b.fqbn, name: b.name }));
    if (!boards.length) return { ok: true, boards: FALLBACK_BOARDS, source: 'builtin' };
    boards.sort((a, b) => a.name.localeCompare(b.name));
    return { ok: true, boards, source: 'cli' };
  },

  async 'GET /api/ports'() {
    if (!CLI) return { ok: true, ports: [], note: 'arduino-cli is not installed yet.' };
    const r = await runJson(['board', 'list']);
    const found = r.data?.detected_ports || r.data || [];
    const ports = [];
    for (const d of Array.isArray(found) ? found : []) {
      const p = d.port || d;
      if (!p || !p.address) continue;
      if (p.protocol && p.protocol !== 'serial') continue;
      const boards = d.matching_boards || d.boards || [];
      const props = p.properties || {};
      ports.push({
        address: p.address,
        label: p.label || p.address,
        vid: props.vid || null,
        pid: props.pid || null,
        serial: props.serialNumber || null,
        guess: boards[0]?.name || null,
        fqbn: boards[0]?.fqbn || null,
        bridge: describeBridge(props.vid, props.pid),
      });
    }
    return { ok: true, ports, warnings: r.data?.warnings || [] };
  },

  async 'GET /api/sketches'() {
    return { ok: true, sketches: await listSketches(), sketchbook: SKETCHBOOK };
  },

  async 'GET /api/sketch'(q) {
    const dir = safeSketchPath(q.get('name') || '');
    const file = path.join(dir, path.basename(q.get('file') || ''));
    safeSketchPath(path.relative(SKETCHBOOK, file));
    const code = await fsp.readFile(file, 'utf8');
    return { ok: true, code };
  },

  async 'POST /api/sketch'(body) {
    const dir = safeSketchPath(body.name || '');
    await fsp.mkdir(dir, { recursive: true });
    const file = path.join(dir, path.basename(body.file || (body.name + '.ino')));
    safeSketchPath(path.relative(SKETCHBOOK, file));
    await fsp.writeFile(file, String(body.code ?? ''), 'utf8');
    return { ok: true, path: file };
  },

  async 'POST /api/sketch/new'(body) {
    const clean = String(body.name || 'Sketch').replace(/[^A-Za-z0-9_ -]/g, '').trim() || 'Sketch';
    let name = clean, n = 1;
    while (true) {
      try { await fsp.access(safeSketchPath(name)); name = clean + '_' + (++n); }
      catch { break; }
    }
    const dir = safeSketchPath(name);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(dir, name + '.ino'),
      String(body.code || DEFAULT_SKETCH), 'utf8');
    return { ok: true, name, file: name + '.ino' };
  },

  async 'POST /api/sketch/delete'(body) {
    const dir = safeSketchPath(body.name || '');
    if (path.resolve(dir) === path.resolve(SKETCHBOOK)) throw new Error('Refusing to delete the sketchbook root.');
    await fsp.rm(dir, { recursive: true, force: true });
    return { ok: true };
  },

  async 'GET /api/libraries'(q) {
    const query = (q.get('q') || '').trim();
    if (!CLI) {
      const hits = MOCK_LIBS.filter((l) => !query ||
        (l.name + ' ' + l.sentence).toLowerCase().includes(query.toLowerCase()));
      return { ok: true, libraries: hits.slice(0, 60), installed: [], source: 'builtin' };
    }
    const inst = await runJson(['lib', 'list']);
    const installed = (inst.data?.installed_libraries || []).map((x) => {
      const lib = x.library || x;
      return {
        name: lib.name, version: lib.version || x.release?.version || '',
        author: lib.author || '', sentence: lib.sentence || '',
        installed: true, dir: lib.install_dir || '',
        includes: lib.provides_includes || [],
      };
    });
    let libraries = [];
    if (query) {
      const r = await runJson(['lib', 'search', query], { timeout: 60000 });
      const found = r.data?.libraries || [];
      libraries = found.slice(0, 60).map((l) => {
        const latest = l.latest || l.releases?.[Object.keys(l.releases || {}).pop()] || {};
        return {
          name: l.name || latest.name,
          version: latest.version || '',
          author: latest.author || '',
          sentence: latest.sentence || '',
          website: latest.website || '',
          architectures: latest.architectures || [],
          includes: latest.provides_includes || [],
          installed: installed.some((i) => i.name === (l.name || latest.name)),
        };
      });
    }
    return { ok: true, libraries, installed, source: 'cli' };
  },

  async 'GET /api/examples'() {
    // Examples that ship with installed libraries and with the esp32 core.
    if (!CLI) return { ok: true, groups: [] };
    const r = await runJson(['lib', 'examples']);
    const groups = [];
    for (const e of r.data?.examples || r.data?.libraries || []) {
      const lib = e.library || e;
      if (!lib?.name) continue;
      groups.push({ library: lib.name, examples: (e.examples || []).slice(0, 40) });
    }
    return { ok: true, groups };
  },
};

function describeBridge(vid, pid) {
  const key = String(vid || '').toLowerCase() + ':' + String(pid || '').toLowerCase();
  const table = {
    '0x1a86:0x7523': 'CH340',
    '0x1a86:0x55d4': 'CH9102',
    '0x1a86:0x7522': 'CH340',
    '0x10c4:0xea60': 'CP2102',
    '0x0403:0x6001': 'FT232R',
    '0x0403:0x6015': 'FT231X',
    '0x303a:0x1001': 'native USB',
    '0x303a:0x0002': 'native USB',
  };
  return table[key] || null;
}

/* ------------------------------------------------------------------ */
/* streaming endpoints                                                 */
/* ------------------------------------------------------------------ */

async function handleSetup(body, stm) {
  const steps = [];
  if (!CLI) {
    stm.send({ t: 'err', line: 'arduino-cli was not found on this machine.' });
    stm.send({ t: 'err', line: 'Install it, then restart FORGE32. See README for the one line installer.' });
    return stm.end({ t: 'done', ok: false });
  }
  stm.send({ t: 'note', line: 'Writing arduino-cli configuration' });
  const cfg = await run(['config', 'init', '--overwrite']);
  stm.send({ t: cfg.ok ? 'out' : 'err', line: (cfg.out || cfg.err).trim().split('\n').pop() });

  stm.send({ t: 'note', line: 'Registering the Espressif board index' });
  let add = await run(['config', 'add', 'board_manager.additional_urls', ESP32_INDEX]);
  if (!add.ok) add = await run(['config', 'set', 'board_manager.additional_urls', ESP32_INDEX]);
  stm.send({ t: add.ok ? 'out' : 'err', line: add.ok ? 'Index registered.' : add.err.trim() });

  stm.send({ t: 'note', line: 'Updating the package index. This downloads a few megabytes.' });
  await stream(stm, ['core', 'update-index']);

  stm.send({ t: 'note', line: 'Installing the esp32 core. This is the big one, expect several minutes.' });
  const code = await stream(stm, ['core', 'install', 'esp32:esp32']);
  steps.push(code);

  const ok = code === 0;
  stm.end({ t: 'done', ok, line: ok
    ? 'Toolchain ready. Pick a board and a port, then upload.'
    : 'Core install did not finish. Check your connection and try again.' });
}

async function handleCompile(body, stm, { upload } = {}) {
  const name = body.name;
  const fqbn = body.fqbn || 'esp32:esp32:esp32';
  const port = body.port || '';
  const dir = safeSketchPath(name || '');

  if (body.code != null && body.file) {
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(dir, path.basename(body.file)), String(body.code), 'utf8');
  }
  for (const extra of body.extraFiles || []) {
    if (!extra || !extra.file) continue;
    await fsp.writeFile(path.join(dir, path.basename(extra.file)), String(extra.code ?? ''), 'utf8');
  }

  if (!CLI) {
    stm.send({ t: 'err', line: 'Cannot build: arduino-cli is not installed.' });
    stm.send({ t: 'note', line: 'Open Setup in the sidebar for the two commands that fix this.' });
    return stm.end({ t: 'done', ok: false });
  }

  const lines = [];
  const collect = (l) => lines.push(l);

  const args = ['compile', '--fqbn', fqbn, dir, '--warnings', 'default'];
  if (body.buildProps) for (const p of body.buildProps) args.push('--build-property', p);

  stm.send({ t: 'note', line: 'Building for ' + fqbn });
  const t0 = Date.now();
  const code = await stream(stm, args, { onLine: collect });
  const text = lines.join('\n');
  const diags = parseDiagnostics(lines, dir);
  const size = parseSizes(text);
  stm.send({ t: 'diags', diags, size, ms: Date.now() - t0 });

  if (code !== 0) {
    stm.send({ t: 'note', line: 'Build failed after ' + ((Date.now() - t0) / 1000).toFixed(1) + 's' });
    return stm.end({ t: 'done', ok: false, phase: 'compile' });
  }
  stm.send({ t: 'ok', line: 'Build finished in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's' });

  if (!upload) return stm.end({ t: 'done', ok: true, phase: 'compile' });

  if (!port) {
    stm.send({ t: 'err', line: 'No port selected, so there is nothing to upload to.' });
    return stm.end({ t: 'done', ok: false, phase: 'upload' });
  }

  const paused = stopMonitor(port);
  if (paused) stm.send({ t: 'note', line: 'Serial monitor released the port.' });

  stm.send({ t: 'note', line: 'Uploading to ' + port });
  const ulines = [];
  const ucode = await stream(stm, ['upload', '-p', port, '--fqbn', fqbn, dir],
    { onLine: (l) => ulines.push(l) });

  if (ucode === 0) {
    stm.send({ t: 'ok', line: 'Upload complete.' });
    stm.end({ t: 'done', ok: true, phase: 'upload', resumeMonitor: paused, port });
  } else {
    const hint = uploadHint(ulines.join('\n'));
    if (hint) stm.send({ t: 'hint', line: hint });
    stm.end({ t: 'done', ok: false, phase: 'upload', resumeMonitor: paused, port });
  }
}

function uploadHint(text) {
  const t = text.toLowerCase();
  if (/failed to connect|packet header|invalid head of packet|no serial data received/.test(t)) {
    return 'The chip never answered. Hold the BOOT button, tap EN or RST, keep holding BOOT until upload starts. Boards without auto reset need this every time.';
  }
  if (/permission denied|could not open port/.test(t)) {
    return process.platform === 'linux'
      ? 'The port is not readable by your user. Run: sudo usermod -a -G dialout $USER, then log out and back in.'
      : 'Another program is holding the port. Close any other serial monitor or IDE and try again.';
  }
  if (/resource busy|device or resource busy/.test(t)) {
    return 'The port is busy. Close the serial monitor here and anywhere else, then upload again.';
  }
  if (/wrong boot mode|download mode/.test(t)) {
    return 'The chip is not in download mode. Hold BOOT while you tap RST, then release BOOT.';
  }
  if (/a fatal error occurred: md5|does not match/.test(t)) {
    return 'The flash verify step disagreed. Try a slower upload speed or a different USB cable, since power dips cause this.';
  }
  if (/no such file or directory|cannot find/.test(t)) {
    return 'That port vanished. Unplug and replug the board, then refresh the port list.';
  }
  return null;
}

async function handleMonitor(body, stm, res) {
  const port = body.port;
  const baud = Number(body.baud || 115200);
  if (!port) return stm.end({ t: 'err', line: 'No port selected.' });
  if (!CLI) return stm.end({ t: 'err', line: 'arduino-cli is not installed, so there is no monitor.' });

  stopMonitor(port);
  const args = ['monitor', '-p', port, '-c', 'baudrate=' + baud, '--quiet'];
  stm.send({ t: 'open', line: 'Listening on ' + port + ' at ' + baud + ' baud' });

  const child = spawn(CLI, args, { env: process.env });
  monitors.set(port, { child, stm });

  let buf = '';
  child.stdout.on('data', (d) => {
    buf += String(d);
    const parts = buf.split(/\r?\n/);
    buf = parts.pop();
    for (const line of parts) stm.send({ t: 'rx', line, ts: Date.now() });
    if (buf.length > 4096) { stm.send({ t: 'rx', line: buf, ts: Date.now() }); buf = ''; }
  });
  child.stderr.on('data', (d) => {
    for (const line of String(d).split(/\r?\n/)) if (line.trim()) stm.send({ t: 'err', line });
  });
  child.on('error', (e) => { stm.end({ t: 'err', line: 'Monitor failed: ' + e.message }); });
  child.on('close', () => {
    if (buf) stm.send({ t: 'rx', line: buf, ts: Date.now() });
    monitors.delete(port);
    stm.end({ t: 'closed', line: 'Monitor closed.' });
  });
  res.on('close', () => { if (monitors.get(port)?.child === child) { monitors.delete(port); try { child.kill(); } catch {} } });
}

const streamRoutes = {
  'POST /api/setup': (body, stm) => handleSetup(body, stm),
  'POST /api/compile': (body, stm) => handleCompile(body, stm, { upload: false }),
  'POST /api/upload': (body, stm) => handleCompile(body, stm, { upload: true }),
  'POST /api/monitor': (body, stm, res) => handleMonitor(body, stm, res),
  'POST /api/lib/install': async (body, stm) => {
    const name = String(body.name || '');
    if (!name) return stm.end({ t: 'err', line: 'No library name given.' });
    if (!CLI) return stm.end({ t: 'err', line: 'arduino-cli is not installed.' });
    const spec = body.version ? name + '@' + body.version : name;
    const code = await stream(stm, ['lib', 'install', spec]);
    stm.end({ t: 'done', ok: code === 0 });
  },
  'POST /api/lib/uninstall': async (body, stm) => {
    if (!CLI) return stm.end({ t: 'err', line: 'arduino-cli is not installed.' });
    const code = await stream(stm, ['lib', 'uninstall', String(body.name || '')]);
    stm.end({ t: 'done', ok: code === 0 });
  },
  'POST /api/erase': async (body, stm) => {
    if (!CLI) return stm.end({ t: 'err', line: 'arduino-cli is not installed.' });
    if (!body.port) return stm.end({ t: 'err', line: 'No port selected.' });
    stopMonitor(body.port);
    stm.send({ t: 'note', line: 'Erasing all flash on ' + body.port });
    const code = await stream(stm, ['upload', '-p', body.port, '--fqbn',
      body.fqbn || 'esp32:esp32:esp32', '--upload-property', 'erase_flash=true',
      safeSketchPath(body.name || '')]);
    stm.end({ t: 'done', ok: code === 0 });
  },
};

const plainRoutes = {
  'POST /api/monitor/write': async (body) => {
    const m = monitors.get(body.port);
    if (!m) return { ok: false, error: 'Monitor is not open on that port.' };
    const eol = { none: '', lf: '\n', cr: '\r', crlf: '\r\n' }[body.eol || 'lf'] ?? '\n';
    m.child.stdin.write(String(body.text ?? '') + eol);
    return { ok: true };
  },
  'POST /api/monitor/stop': async (body) => {
    const stopped = body.port ? stopMonitor(body.port) : stopAllMonitors().length > 0;
    return { ok: true, stopped };
  },
};

/* ------------------------------------------------------------------ */
/* http plumbing                                                       */
/* ------------------------------------------------------------------ */

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.map': 'application/json',
};

function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('Body too large.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('Body is not valid JSON.')); }
    });
    req.on('error', reject);
  });
}

/** Block other web pages from driving this server through the browser. */
function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const u = new URL(origin);
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '[::1]';
  } catch { return false; }
}

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const full = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[\/\\])+/, ''));
  if (!full.startsWith(PUBLIC_DIR)) { res.writeHead(403).end('Forbidden'); return; }
  try {
    const st = await fsp.stat(full);
    if (st.isDirectory()) throw new Error('dir');
    const body = await fsp.readFile(full);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found: ' + rel);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const key = req.method + ' ' + url.pathname;

  if (!originAllowed(req)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Cross origin requests are refused.' }));
  }

  if (streamRoutes[key]) {
    let body = {};
    try { body = await readBody(req); }
    catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    const stm = openStream(res);
    res.on('close', () => stm.markClosed());
    try { await streamRoutes[key](body, stm, res); }
    catch (e) { stm.end({ t: 'err', line: e.message, fatal: true }); }
    return;
  }

  if (api[key] || plainRoutes[key]) {
    const handler = api[key] || plainRoutes[key];
    try {
      const arg = req.method === 'GET' ? url.searchParams : await readBody(req);
      const out = await handler(arg);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(out));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  }

  if (url.pathname.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'No such endpoint.' }));
  }

  return serveStatic(req, res, url.pathname);
});

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

function banner(url) {
  const line = (s) => '  ' + s;
  console.log('');
  console.log(line('FORGE32  an ESP32 workbench'));
  console.log(line('─'.repeat(46)));
  console.log(line('open        ' + url));
  console.log(line('sketchbook  ' + SKETCHBOOK));
  console.log(line('arduino-cli ' + (CLI ? CLI + '  v' + (CLI_VERSION || '?') : 'not found, interface runs in preview mode')));
  console.log(line('─'.repeat(46)));
  console.log(line('Ctrl+C to stop'));
  console.log('');
}

async function main() {
  CLI = MOCK ? null : findCli();
  if (CLI) {
    CLI_VERSION = await cliVersion(CLI);
    if (!CLI_VERSION) CLI = null;
  }
  await ensureSketchbook();

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error('\n  Port ' + PORT + ' is already in use.');
      console.error('  Either FORGE32 is already running, or set a different port:');
      console.error('    FORGE32_PORT=4033 node server.js\n');
      process.exit(1);
    }
    throw e;
  });

  server.listen(PORT, HOST, () => banner('http://' + HOST + ':' + PORT));
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    stopAllMonitors();
    console.log('\n  FORGE32 stopped.\n');
    process.exit(0);
  });
}

main();
