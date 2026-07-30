/* A small, forgiving scanner over the open sketch.
 * It is not a C++ parser. It finds the things completion and the pin rail need:
 * includes, macros, variables and their types, functions, and which GPIO the
 * code actually touches.
 */

const TYPE_WORD = '[A-Za-z_][A-Za-z0-9_:<>,\\s\\*&]*?';

/** Strip comments and string bodies so regexes do not trip over them. */
export function blank(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') {
      while (i < n && src[i] !== '\n') { out += ' '; i++; }
    } else if (c === '/' && d === '*') {
      out += '  '; i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++; }
      if (i < n) { out += '  '; i += 2; }
    } else if (c === '"' || c === "'") {
      const q = c; out += q; i++;
      while (i < n && src[i] !== q) {
        if (src[i] === '\\') { out += ' '; i++; if (i < n) { out += ' '; i++; } continue; }
        out += src[i] === '\n' ? '\n' : ' '; i++;
      }
      if (i < n) { out += q; i++; }
    } else {
      out += c; i++;
    }
  }
  return out;
}

const NOT_A_TYPE = new Set([
  'if', 'else', 'for', 'while', 'switch', 'return', 'case', 'do', 'break', 'continue',
  'sizeof', 'new', 'delete', 'public', 'private', 'protected', 'typedef', 'using',
  'namespace', 'template', 'operator', 'friend', 'inline', 'virtual', 'explicit', 'default',
]);

export function scan(src) {
  const code = blank(src);
  const lines = code.split('\n');
  const rawLines = src.split('\n');

  const includes = [];
  const macros = new Map();     // name -> { value, numeric, line }
  const vars = new Map();       // name -> { type, line, isConst, global }
  const funcs = new Map();      // name -> { ret, args, line }
  const enums = [];

  /* includes and macros */
  rawLines.forEach((line, idx) => {
    let m = /^\s*#\s*include\s*[<"]([^>"]+)[>"]/.exec(line);
    if (m) { includes.push({ name: m[1], line: idx }); return; }
    m = /^\s*#\s*define\s+([A-Za-z_]\w*)\s*(?!\()(.*)$/.exec(line);
    if (m) {
      const value = m[2].replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').trim();
      macros.set(m[1], { value, numeric: numeric(value), line: idx });
    }
  });

  /* functions: a return type, a name, parentheses, then a brace */
  const reFunc = new RegExp(
    '^[ \\t]*(?:(?:static|inline|virtual|extern|IRAM_ATTR|ICACHE_RAM_ATTR)\\s+)*' +
    '(' + TYPE_WORD + ')\\s+([A-Za-z_]\\w*)\\s*\\(([^;{)]*)\\)\\s*(?:const\\s*)?\\{', 'gm');
  let fm;
  while ((fm = reFunc.exec(code))) {
    const ret = fm[1].trim(), name = fm[2], args = fm[3].trim();
    if (NOT_A_TYPE.has(ret) || NOT_A_TYPE.has(name)) continue;
    funcs.set(name, {
      ret, args, line: lineOf(code, fm.index),
      sig: ret + ' ' + name + '(' + args + ')',
    });
  }

  /* enum members */
  const reEnum = /enum\s+(?:class\s+)?(\w+)?\s*(?::[^{]+)?\{([^}]*)\}/g;
  let em;
  while ((em = reEnum.exec(code))) {
    for (const part of em[2].split(',')) {
      const nm = /^\s*([A-Za-z_]\w*)/.exec(part);
      if (nm) enums.push({ name: nm[1], enumName: em[1] || '' });
    }
  }

  /* variables and object instances */
  const reVar = new RegExp(
    '^[ \\t]*(?:(const|constexpr|static|volatile|extern)\\s+)*' +
    '([A-Za-z_]\\w*(?:\\s*::\\s*\\w+)?(?:\\s*<[^>;]*>)?)\\s*(\\*|&)?\\s*' +
    '([A-Za-z_]\\w*)\\s*(?:\\[[^\\]]*\\])?\\s*(=[^;]*|\\([^;]*\\))?\\s*;', 'gm');
  let vm;
  while ((vm = reVar.exec(code))) {
    const qual = vm[1] || '', type = vm[2].trim(), name = vm[4];
    if (NOT_A_TYPE.has(type) || NOT_A_TYPE.has(name)) continue;
    if (funcs.has(name)) continue;
    if (/^(return|else)$/.test(type)) continue;
    const line = lineOf(code, vm.index);
    const indent = /^[ \t]*/.exec(vm[0])[0].length;
    vars.set(name, {
      type: type.replace(/\s+/g, ' '),
      line,
      isConst: /const|constexpr/.test(qual),
      global: indent === 0,
      init: (vm[5] || '').trim(),
    });
  }

  /* simple auto declarations */
  const reAuto = /^[ \t]*(?:auto|float|double|int|long|bool|char|String|uint\d+_t|int\d+_t|size_t|unsigned(?:\s+\w+)?)\s+([A-Za-z_]\w*)\s*=/gm;
  let am;
  while ((am = reAuto.exec(code))) {
    if (!vars.has(am[1])) {
      const t = /^[ \t]*(\S+(?:\s+\w+)?)/.exec(am[0])[1];
      vars.set(am[1], { type: t, line: lineOf(code, am.index), isConst: false, global: false, init: '' });
    }
  }

  return { includes, macros, vars, funcs, enums, code, lines };
}

function lineOf(text, index) {
  let line = 0;
  for (let i = 0; i < index; i++) if (text[i] === '\n') line++;
  return line;
}

function numeric(value) {
  if (value == null) return null;
  const v = String(value).trim();
  if (/^0[xX][0-9a-fA-F]+$/.test(v)) return parseInt(v, 16);
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  return null;
}

/** Resolve an expression to a GPIO number if we possibly can. */
export function resolvePin(expr, model) {
  if (expr == null) return null;
  const t = String(expr).trim();
  if (!t) return null;

  const direct = numeric(t);
  if (direct != null) return direct;

  const touch = /^T([0-9])$/.exec(t);
  if (touch) return [4, 0, 2, 15, 13, 12, 14, 27, 33, 32][+touch[1]] ?? null;

  const gpioNum = /^GPIO_NUM_(\d+)$/.exec(t);
  if (gpioNum) return +gpioNum[1];

  const a = /^A(\d+)$/.exec(t);
  if (a) return [36, 37, 38, 39, 32, 33, 34, 35, 4, 0, 2, 15, 13, 12, 14, 27, 25, 26][+a[1]] ?? null;

  if (model?.macros?.has(t)) {
    const m = model.macros.get(t);
    if (m.numeric != null) return m.numeric;
    if (m.value && m.value !== t) return resolvePin(m.value, { ...model, macros: without(model.macros, t) });
  }
  if (model?.vars?.has(t)) {
    const v = model.vars.get(t);
    const init = (v.init || '').replace(/^=\s*/, '').replace(/^\(|\)$/g, '').trim();
    if (init) {
      const n = numeric(init);
      if (n != null) return n;
      if (init !== t) return resolvePin(init, { ...model, vars: without(model.vars, t) });
    }
  }
  if (/^LED_BUILTIN$/.test(t)) return model?.ledBuiltin ?? 2;
  return null;
}

function without(map, key) {
  const copy = new Map(map);
  copy.delete(key);
  return copy;
}

/* ------------------------------------------------------------------ */
/* what the sketch does to each pin                                    */
/* ------------------------------------------------------------------ */

const PIN_CALLS = [
  [/\bpinMode\s*\(\s*([^,()]+)\s*,\s*([A-Za-z_]\w*)\s*\)/g, (m) => ({
    pin: m[1], role: modeRole(m[2]), detail: 'pinMode ' + m[2] })],
  [/\bdigitalWrite\s*\(\s*([^,()]+)\s*,/g, () => ({ role: 'out', detail: 'digitalWrite' })],
  [/\bdigitalRead\s*\(\s*([^,()]+?)\s*\)/g, () => ({ role: 'in', detail: 'digitalRead' })],
  [/\banalogRead\s*\(\s*([^,()]+?)\s*\)/g, () => ({ role: 'adc', detail: 'analogRead' })],
  [/\banalogReadMilliVolts\s*\(\s*([^,()]+?)\s*\)/g, () => ({ role: 'adc', detail: 'analogRead mV' })],
  [/\banalogWrite\s*\(\s*([^,()]+)\s*,/g, () => ({ role: 'pwm', detail: 'analogWrite' })],
  [/\bdacWrite\s*\(\s*([^,()]+)\s*,/g, () => ({ role: 'dac', detail: 'dacWrite' })],
  [/\bledcAttach(?:Pin|Channel)?\s*\(\s*([^,()]+)\s*,/g, () => ({ role: 'pwm', detail: 'LEDC' })],
  [/\bledcWrite\s*\(\s*([^,()]+)\s*,/g, () => ({ role: 'pwm', detail: 'LEDC' })],
  [/\btouchRead\s*\(\s*([^,()]+?)\s*\)/g, () => ({ role: 'touch', detail: 'touchRead' })],
  [/\btouchAttachInterrupt\s*\(\s*([^,()]+)\s*,/g, () => ({ role: 'touch', detail: 'touch interrupt' })],
  [/\battachInterrupt(?:Arg)?\s*\(\s*([^,()]+)\s*,/g, () => ({ role: 'int', detail: 'interrupt' })],
  [/\btone\s*\(\s*([^,()]+)\s*,/g, () => ({ role: 'pwm', detail: 'tone' })],
  [/\bpulseIn\s*\(\s*([^,()]+)\s*,/g, () => ({ role: 'in', detail: 'pulseIn' })],
  [/\.attach\s*\(\s*([^,()]+?)\s*[,)]/g, () => ({ role: 'pwm', detail: 'servo' })],
  [/\besp_sleep_enable_ext0_wakeup\s*\(\s*([^,()]+)\s*,/g, () => ({ role: 'wake', detail: 'ext0 wake' })],
];

function modeRole(mode) {
  if (/OUTPUT/.test(mode)) return 'out';
  if (/PULLUP|PULLDOWN|INPUT/.test(mode)) return 'in';
  if (/ANALOG/.test(mode)) return 'adc';
  return 'in';
}

export function findPinUsage(src, model) {
  const code = blank(src);
  const used = new Map(); // gpio -> { roles:Set, details:Set, lines:Set }

  const add = (pinExpr, info, index) => {
    const gpio = resolvePin(pinExpr, model);
    if (gpio == null || gpio < 0 || gpio > 48) return;
    if (!used.has(gpio)) used.set(gpio, { roles: new Set(), details: new Set(), lines: new Set() });
    const e = used.get(gpio);
    if (info.role) e.roles.add(info.role);
    if (info.detail) e.details.add(info.detail);
    e.lines.add(lineOf(code, index));
  };

  for (const [re, make] of PIN_CALLS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(code))) {
      const info = make(m);
      add(info.pin ?? m[1], info, m.index);
    }
  }

  /* two pin and four pin bus calls */
  let m;
  const reWire = /\bWire1?\s*\.\s*(?:begin|setPins)\s*\(\s*([^,()]+)\s*,\s*([^,()]+?)\s*[,)]/g;
  while ((m = reWire.exec(code))) {
    add(m[1], { role: 'i2c', detail: 'I2C SDA' }, m.index);
    add(m[2], { role: 'i2c', detail: 'I2C SCL' }, m.index);
  }
  const reSPI = /\bSPI\s*\.\s*begin\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*,\s*([^,()]+)\s*(?:,\s*([^,()]+?)\s*)?\)/g;
  while ((m = reSPI.exec(code))) {
    add(m[1], { role: 'spi', detail: 'SPI SCK' }, m.index);
    add(m[2], { role: 'spi', detail: 'SPI MISO' }, m.index);
    add(m[3], { role: 'spi', detail: 'SPI MOSI' }, m.index);
    if (m[4]) add(m[4], { role: 'spi', detail: 'SPI CS' }, m.index);
  }
  const reSerialPins = /\bSerial[12]?\s*\.\s*begin\s*\(\s*[^,()]+\s*,\s*[^,()]+\s*,\s*([^,()]+)\s*,\s*([^,()]+?)\s*\)/g;
  while ((m = reSerialPins.exec(code))) {
    add(m[1], { role: 'uart', detail: 'UART RX' }, m.index);
    add(m[2], { role: 'uart', detail: 'UART TX' }, m.index);
  }
  const reNeo = /Adafruit_NeoPixel\s+\w+\s*\(\s*[^,()]+\s*,\s*([^,()]+)\s*,/g;
  while ((m = reNeo.exec(code))) add(m[1], { role: 'out', detail: 'LED data' }, m.index);
  const reDHT = /\bDHT\s+\w+\s*\(\s*([^,()]+)\s*,/g;
  while ((m = reDHT.exec(code))) add(m[1], { role: 'in', detail: 'DHT data' }, m.index);
  const reOneWire = /\bOneWire\s+\w+\s*\(\s*([^,()]+?)\s*\)/g;
  while ((m = reOneWire.exec(code))) add(m[1], { role: 'in', detail: '1-Wire' }, m.index);

  const out = [];
  for (const [gpio, e] of used) {
    out.push({
      gpio,
      roles: [...e.roles],
      details: [...e.details],
      lines: [...e.lines].sort((a, b) => a - b),
    });
  }
  return out.sort((a, b) => a.gpio - b.gpio);
}
