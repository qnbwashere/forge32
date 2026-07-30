/* Inline prediction.
 * Guesses the rest of what you are about to write and offers it as ghost text.
 * Everything here runs locally off patterns and off your own sketch, so it works
 * with no network and no account.
 *
 * predict() returns { text, confidence, why } or null.
 * Nothing is offered below the confidence floor, because a wrong guess costs
 * more attention than a missing one.
 */

import { GLOBALS, MEMBERS, INSTANCES, TYPE_ALIASES } from './symbols.js';
import { blank } from './scan.js';
import { chipInfo } from './pins.js';

const FLOOR = 0.45;

/* ------------------------------------------------------------------ */
/* reading the situation                                               */
/* ------------------------------------------------------------------ */

/** Which function the caret sits in, by counting braces backwards. */
export function enclosingFunction(text, caret) {
  const code = blank(text).slice(0, caret);
  let depth = 0;
  for (let i = code.length - 1; i >= 0; i--) {
    const c = code[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) {
        const head = code.slice(Math.max(0, i - 200), i);
        const m = /([A-Za-z_]\w*)\s*\([^()]*\)\s*(?:const\s*)?$/.exec(head);
        return m ? m[1] : null;
      }
      depth--;
    }
  }
  return null;
}

function indentOf(line) {
  return /^[ \t]*/.exec(line)[0];
}

function facts(text, model) {
  const code = blank(text);
  const has = (re) => re.test(code);
  const varsOfType = (typeRe) => {
    const out = [];
    for (const [name, v] of model.vars) if (typeRe.test(v.type)) out.push(name);
    return out;
  };
  return {
    code,
    serialBegun: has(/Serial\s*\.\s*begin\s*\(/),
    wifiIncluded: (model.includes || []).some((h) => /^WiFi/.test(h.name)),
    wifiBegun: has(/WiFi\s*\.\s*(?:begin|softAP)\s*\(/),
    wifiUsed: has(/\bWiFi\s*\./),
    otaIncluded: (model.includes || []).some((h) => /ArduinoOTA/.test(h.name)),
    otaBegun: has(/ArduinoOTA\s*\.\s*begin/),
    otaHandled: has(/ArduinoOTA\s*\.\s*handle/),
    servers: varsOfType(/^WebServer$/),
    asyncServers: varsOfType(/^AsyncWebServer$/),
    mqtt: varsOfType(/^PubSubClient$/),
    strips: varsOfType(/^Adafruit_NeoPixel$/),
    displays: varsOfType(/^Adafruit_SSD1306$/),
    servos: varsOfType(/^(Servo|ESP32Servo)$/),
    buttons: varsOfType(/^Button2$/),
    dhts: varsOfType(/^DHT$/),
    prefs: varsOfType(/^Preferences$/),
    has,
  };
}

/** Pin like names the sketch already defines, most specific first. */
function pinNames(model, want) {
  const out = [];
  const push = (name, weight) => out.push({ name, weight });
  const test = (name, re) => re.test(name);
  for (const [name, m] of model.macros) {
    if (m.numeric == null) continue;
    if (want === 'out' && test(name, /LED|LAMP|RELAY|OUT|BUZZ|PWM|FAN|MOTOR|PIXEL|DATA/i)) push(name, 3);
    else if (want === 'in' && test(name, /BUTTON|BTN|SWITCH|SW|IN$|INPUT|SENSOR|PIR|TRIG|ECHO/i)) push(name, 3);
    else if (test(name, /PIN|GPIO/i)) push(name, 2);
    else push(name, 1);
  }
  for (const [name, v] of model.vars) {
    if (!/int|uint8_t|byte|const/.test(v.type)) continue;
    if (!/PIN|LED|BUTTON|BTN|GPIO/i.test(name)) continue;
    push(name, want === 'out' && /LED|OUT/i.test(name) ? 3 : 2);
  }
  out.sort((a, b) => b.weight - a.weight);
  return out.map((o) => o.name);
}

function bestPin(model, want, fallback) {
  const named = pinNames(model, want);
  if (named.length) return named[0];
  return fallback;
}

/** Most common literal already used with a call, so delay guesses match your style. */
function commonLiteral(code, fnName, fallback) {
  const re = new RegExp('\\b' + fnName + '\\s*\\(\\s*(\\d+)\\s*\\)', 'g');
  const counts = new Map();
  let m;
  while ((m = re.exec(code))) counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  if (!counts.size) return fallback;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/* ------------------------------------------------------------------ */
/* argument prediction                                                 */
/* ------------------------------------------------------------------ */

/** Find an unclosed call that the caret sits inside, with nothing typed yet. */
function openCall(text, caret) {
  let depth = 0;
  for (let i = caret - 1; i >= 0 && caret - i < 400; i--) {
    const c = text[i];
    if (c === ')') depth++;
    else if (c === '(') {
      if (depth === 0) {
        const typed = text.slice(i + 1, caret);
        if (/[;{}\n]/.test(typed)) return null;
        const before = text.slice(0, i);
        const nm = /([A-Za-z_]\w*)\s*$/.exec(before);
        if (!nm) return null;
        const dot = /([A-Za-z_]\w*)\s*(?:\.|->)\s*$/.exec(before.slice(0, nm.index));
        return { name: nm[1], owner: dot ? dot[1] : null, typed, open: i };
      }
      depth--;
    } else if (c === ';' || c === '{' || c === '}') return null;
  }
  return null;
}

const ARG_RULES = {
  pinMode: (m) => bestPin(m, 'out', 'LED_BUILTIN') + ', OUTPUT',
  digitalWrite: (m) => bestPin(m, 'out', 'LED_BUILTIN') + ', HIGH',
  digitalRead: (m) => bestPin(m, 'in', '0'),
  analogWrite: (m) => bestPin(m, 'out', 'LED_BUILTIN') + ', 128',
  attachInterrupt: (m) => bestPin(m, 'in', '0') + ', onEdge, FALLING',
  ledcAttach: (m) => bestPin(m, 'out', 'LED_BUILTIN') + ', 5000, 12',
  ledcWrite: (m) => bestPin(m, 'out', 'LED_BUILTIN') + ', 2048',
  map: () => 'value, 0, 4095, 0, 255',
  constrain: () => 'value, 0, 255',
  random: () => '0, 100',
  pulseIn: (m) => bestPin(m, 'in', '0') + ', HIGH, 30000',
  delayMicroseconds: () => '100',
  esp_sleep_enable_timer_wakeup: () => '10 * 1000000ULL',
  xTaskCreatePinnedToCore: () => 'workerTask, "worker", 4096, NULL, 1, NULL, 0',
  xTaskCreate: () => 'workerTask, "worker", 4096, NULL, 1, NULL',
  vTaskDelay: () => 'pdMS_TO_TICKS(100)',
  pdMS_TO_TICKS: () => '100',
};

function predictArgs(text, caret, model, chip) {
  const call = openCall(text, caret);
  if (!call || call.typed.trim()) return null;

  const close = /^\s*\)/.test(text.slice(caret)) ? '' : ')';
  const needsSemi = close && /^\s*$/.test(restOfLine(text, caret));

  /* analogRead should suggest a pin that survives WiFi being on */
  if (call.name === 'analogRead' || call.name === 'analogReadMilliVolts') {
    const info = chipInfo(chip);
    const named = pinNames(model, 'in');
    const pin = named[0] || (info.adc1.length ? String(info.adc1[0]) : '34');
    return { text: pin + close, confidence: 0.6, why: 'ADC pin' };
  }

  if (call.name === 'delay') {
    const ms = commonLiteral(blank(text), 'delay', '1000');
    return { text: ms + close + (needsSemi ? ';' : ''), confidence: 0.55, why: 'delay you use most' };
  }

  if (call.owner && call.name === 'begin') {
    const type = INSTANCES[call.owner] || TYPE_ALIASES[model.vars.get(call.owner)?.type?.trim()] ||
      model.vars.get(call.owner)?.type?.trim();
    if (type === 'HardwareSerial') return { text: '115200' + close + (needsSemi ? ';' : ''), confidence: 0.9, why: 'ESP32 default baud' };
    if (type === 'TwoWire') return { text: '21, 22' + close + (needsSemi ? ';' : ''), confidence: 0.6, why: 'default I2C pins' };
  }
  if (call.owner === 'WiFi' && call.name === 'begin') {
    const ssid = model.vars.has('ssid') || model.macros.has('ssid') ? 'ssid' : '"your-network"';
    const pass = model.vars.has('password') || model.macros.has('password') ? 'password' : '"your-password"';
    return { text: ssid + ', ' + pass + close + (needsSemi ? ';' : ''), confidence: 0.75, why: 'credentials' };
  }
  if (call.owner === 'WiFi' && call.name === 'softAP') {
    return { text: '"ESP32-AP", "12345678"' + close + (needsSemi ? ';' : ''), confidence: 0.6, why: 'access point' };
  }
  if (call.owner && call.name === 'attach' && model.vars.get(call.owner)) {
    return { text: bestPin(model, 'out', '13') + close + (needsSemi ? ';' : ''), confidence: 0.6, why: 'servo pin' };
  }

  const rule = ARG_RULES[call.name];
  if (rule) {
    const args = rule(model);
    const stmt = needsSemi && !/^(map|constrain|random|digitalRead|pdMS_TO_TICKS|pulseIn)$/.test(call.name);
    return { text: args + close + (stmt ? ';' : ''), confidence: 0.62, why: 'usual arguments' };
  }

  /* fall back to the template stored with the symbol */
  const sym = GLOBALS.find((g) => g.name === call.name);
  if (sym?.insert) {
    const after = sym.insert.slice(sym.insert.indexOf('(') + 1);
    const plain = after.replace(/\$\{\d+:([^}]*)\}/g, '$1').replace(/\$\{?\d+\}?/g, '').replace(/\$0/g, '');
    if (plain.trim() && plain.length < 60) {
      return { text: plain.replace(/;\s*$/, needsSemi ? ';' : ''), confidence: 0.5, why: 'signature' };
    }
  }
  return null;
}

function restOfLine(text, caret) {
  const nl = text.indexOf('\n', caret);
  return text.slice(caret, nl < 0 ? text.length : nl);
}

/* ------------------------------------------------------------------ */
/* repeating a pattern                                                 */
/* ------------------------------------------------------------------ */

const NUM = /\d+/g;

function template(line) {
  return line.replace(NUM, '\u0000');
}

function numbers(line) {
  return (line.match(NUM) || []).map(Number);
}

function render(tpl, nums) {
  let i = 0;
  return tpl.replace(/\u0000/g, () => String(nums[i++] ?? 0));
}

/** If the last lines are a numbered series, continue it. */
function predictRepetition(lines, row, currentLine) {
  const prev = [];
  for (let i = row - 1; i >= 0 && prev.length < 3; i--) {
    if (!lines[i].trim()) break;
    prev.unshift(lines[i]);
  }
  if (prev.length < 2) return null;

  const a = prev[prev.length - 2], b = prev[prev.length - 1];
  if (template(a) !== template(b)) return null;
  const na = numbers(a), nb = numbers(b);
  if (!na.length || na.length !== nb.length) return null;

  const deltas = nb.map((v, i) => v - na[i]);
  if (deltas.every((d) => d === 0)) return null;
  if (deltas.some((d) => Math.abs(d) > 64)) return null;

  const next = nb.map((v, i) => v + deltas[i]);
  if (next.some((v) => v < 0)) return null;
  const line = render(template(b), next);

  if (!currentLine.trim()) {
    return { text: line.replace(/^[ \t]*/, ''), confidence: 0.72, why: 'continuing the series' };
  }
  const typed = currentLine;
  if (line.startsWith(typed) && line.length > typed.length) {
    return { text: line.slice(typed.length), confidence: 0.8, why: 'continuing the series' };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* statement level guesses                                             */
/* ------------------------------------------------------------------ */

function firstOutputPin(model) {
  return bestPin(model, 'out', 'LED_BUILTIN');
}

function predictStatement(text, caret, model, chip) {
  const lines = text.split('\n');
  const before = text.slice(0, caret);
  const row = before.split('\n').length - 1;
  const currentLine = lines[row] ?? '';
  const typed = currentLine.slice(0, caret - (before.lastIndexOf('\n') + 1));

  /* only offer when the caret is at the end of the line */
  if (currentLine.slice(typed.length).trim()) return null;

  const fn = enclosingFunction(text, caret);
  const f = facts(text, model);
  const ind = indentOf(currentLine) || '  ';
  const empty = !typed.trim();

  const prevLine = (() => {
    for (let i = row - 1; i >= 0; i--) if (lines[i].trim()) return lines[i].trim();
    return '';
  })();

  /* --- follow ups that depend on the line above --- */

  if (empty) {
    let m = /^digitalWrite\s*\(\s*([^,)]+)\s*,\s*HIGH\s*\)\s*;$/.exec(prevLine);
    if (m && !f.has(new RegExp('digitalWrite\\s*\\(\\s*' + escapeRe(m[1].trim()) + '\\s*,\\s*LOW'))) {
      const ms = commonLiteral(f.code, 'delay', '500');
      return {
        text: 'delay(' + ms + ');\n' + ind + 'digitalWrite(' + m[1].trim() + ', LOW);\n' + ind + 'delay(' + ms + ');',
        confidence: 0.7, why: 'finishing the blink',
      };
    }
    if (/^while\s*\(\s*WiFi\s*\.\s*status\s*\(\s*\)\s*!=\s*WL_CONNECTED\s*\)\s*\{$/.test(prevLine)) {
      return { text: 'delay(300);\n' + ind + 'Serial.print(".");', confidence: 0.85, why: 'waiting for the join' };
    }
    if (/^#include\s*<WiFi\.h>$/.test(prevLine) && !model.vars.has('ssid')) {
      return {
        text: '\nconst char* ssid     = "your-network";\nconst char* password = "your-password";',
        confidence: 0.68, why: 'credentials go next',
      };
    }
    if (/^Serial\s*\.\s*begin\s*\(/.test(prevLine) && fn === 'setup') {
      const pins = pinNames(model, 'out');
      if (pins.length && !f.has(new RegExp('pinMode\\s*\\(\\s*' + escapeRe(pins[0])))) {
        return { text: 'pinMode(' + pins[0] + ', OUTPUT);', confidence: 0.62, why: 'that pin has no mode yet' };
      }
    }
    let sw = /^xSemaphoreTake\s*\(\s*([^,)]+)/.exec(prevLine);
    if (sw) return { text: '\n' + ind + 'xSemaphoreGive(' + sw[1].trim() + ');', confidence: 0.55, why: 'always release a mutex' };
    let bt = /^(\w+)\s*\.\s*beginTransmission\s*\(/.exec(prevLine);
    if (bt) return { text: bt[1] + '.endTransmission();', confidence: 0.55, why: 'close the transmission' };
    let op = /^File\s+(\w+)\s*=\s*\w+\.open\s*\(/.exec(prevLine);
    if (op) return { text: 'if (!' + op[1] + ') { Serial.println("open failed"); return; }', confidence: 0.5, why: 'check the handle' };
  }

  /* --- filling out setup --- */

  if (fn === 'setup' && empty) {
    if (!f.serialBegun) {
      return { text: 'Serial.begin(115200);', confidence: 0.88, why: 'nothing has opened the serial port' };
    }
    const pins = pinNames(model, 'out').filter((p) => !f.has(new RegExp('pinMode\\s*\\(\\s*' + escapeRe(p))));
    if (pins.length) {
      return { text: 'pinMode(' + pins[0] + ', OUTPUT);', confidence: 0.7, why: pins[0] + ' has no mode yet' };
    }
    if (f.wifiIncluded && !f.wifiBegun) {
      return {
        text: 'WiFi.mode(WIFI_STA);\n' + ind + 'WiFi.begin(ssid, password);\n' +
              ind + 'while (WiFi.status() != WL_CONNECTED) {\n' + ind + '  delay(300);\n' +
              ind + '  Serial.print(".");\n' + ind + '}\n' +
              ind + 'Serial.println(WiFi.localIP());',
        confidence: 0.78, why: 'WiFi is included but never started',
      };
    }
    for (const s of f.strips) {
      if (!f.has(new RegExp(escapeRe(s) + '\\s*\\.\\s*begin'))) {
        return { text: s + '.begin();\n' + ind + s + '.setBrightness(40);\n' + ind + s + '.show();', confidence: 0.72, why: s + ' is not started' };
      }
    }
    for (const d of f.displays) {
      if (!f.has(new RegExp(escapeRe(d) + '\\s*\\.\\s*begin'))) {
        return {
          text: 'if (!' + d + '.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {\n' + ind +
                '  Serial.println("No display at 0x3C");\n' + ind + '}',
          confidence: 0.72, why: d + ' is not started',
        };
      }
    }
    for (const s of f.servers) {
      if (!f.has(new RegExp(escapeRe(s) + '\\s*\\.\\s*begin'))) {
        return {
          text: s + '.on("/", handleRoot);\n' + ind + s + '.begin();',
          confidence: 0.7, why: s + ' is not listening yet',
        };
      }
    }
    for (const b of f.buttons) {
      if (!f.has(new RegExp(escapeRe(b) + '\\s*\\.\\s*begin'))) {
        return { text: b + '.begin(' + bestPin(model, 'in', '0') + ');', confidence: 0.65, why: b + ' has no pin' };
      }
    }
    for (const d of f.dhts) {
      if (!f.has(new RegExp(escapeRe(d) + '\\s*\\.\\s*begin'))) {
        return { text: d + '.begin();', confidence: 0.65, why: d + ' is not started' };
      }
    }
    if (f.otaIncluded && !f.otaBegun) {
      return { text: 'ArduinoOTA.begin();', confidence: 0.7, why: 'OTA is included but never started' };
    }
  }

  /* --- filling out loop --- */

  if (fn === 'loop' && empty) {
    for (const s of f.servers) {
      if (!f.has(new RegExp(escapeRe(s) + '\\s*\\.\\s*handleClient'))) {
        return { text: s + '.handleClient();', confidence: 0.85, why: 'the server stops responding without this' };
      }
    }
    for (const q of f.mqtt) {
      if (!f.has(new RegExp(escapeRe(q) + '\\s*\\.\\s*loop\\s*\\('))) {
        return { text: q + '.loop();', confidence: 0.85, why: 'the broker drops you without this' };
      }
    }
    if (f.otaIncluded && !f.otaHandled) {
      return { text: 'ArduinoOTA.handle();', confidence: 0.85, why: 'OTA needs pumping every pass' };
    }
    for (const b of f.buttons) {
      if (!f.has(new RegExp(escapeRe(b) + '\\s*\\.\\s*loop\\s*\\('))) {
        return { text: b + '.loop();', confidence: 0.8, why: 'the button needs polling' };
      }
    }
    /* nothing structural missing, so offer a blink or a heartbeat */
    const bodyEmpty = isFunctionBodyEmpty(text, caret);
    if (bodyEmpty) {
      const pin = pinNames(model, 'out')[0];
      if (pin) {
        const ms = commonLiteral(f.code, 'delay', '500');
        return {
          text: 'digitalWrite(' + pin + ', HIGH);\n' + ind + 'delay(' + ms + ');\n' +
                ind + 'digitalWrite(' + pin + ', LOW);\n' + ind + 'delay(' + ms + ');',
          confidence: 0.6, why: 'blink ' + pin,
        };
      }
      if (f.serialBegun) {
        return {
          text: 'Serial.printf("uptime %lu ms\\n", millis());\n' + ind + 'delay(1000);',
          confidence: 0.5, why: 'a heartbeat to prove it runs',
        };
      }
    }
  }

  /* --- partial line idioms --- */

  if (!empty) {
    const t = typed.trimStart();
    const pairs = [
      [/^if\s*\(\s*digitalRead\($/, bestPin(model, 'in', 'BUTTON_PIN') + ') == LOW) {', 0.6, 'button pressed test'],
      [/^if\s*\(\s*millis\(\)\s*$/, '- lastTick >= interval) {', 0.55, 'non blocking timer'],
      [/^if\s*\(\s*WiFi\.$/, 'status() != WL_CONNECTED) {', 0.6, 'connection check'],
      [/^while\s*\(\s*WiFi\.$/, 'status() != WL_CONNECTED) {', 0.65, 'wait for the join'],
      [/^for\s*\($/, 'int i = 0; i < 10; i++) {', 0.55, 'counted loop'],
      [/^if\s*\(\s*Serial\.$/, 'available()) {', 0.6, 'incoming bytes test'],
      [/^while\s*\(\s*Serial\.$/, 'available()) {', 0.6, 'drain the buffer'],
      [/^if\s*\(\s*!$/, model.vars.size ? '' : '', 0, ''],
      [/^Serial\.printf\("$/, '%d\\n", value);', 0.5, 'format string'],
      [/^static uint32_t $/, 'lastTick = 0;', 0.5, 'timer state'],
      [/^volatile $/, 'uint32_t count = 0;', 0.45, 'shared with an interrupt'],
      [/^void IRAM_ATTR $/, 'onEdge() {', 0.6, 'interrupt handler'],
      [/^const char\* $/, 'ssid = "your-network";', 0.5, 'credentials'],
    ];
    for (const [re, out, conf, why] of pairs) {
      if (conf && re.test(t)) return { text: out, confidence: conf, why };
    }
  }

  return null;
}

function isFunctionBodyEmpty(text, caret) {
  const code = blank(text);
  let i = caret - 1, depth = 0;
  while (i >= 0) {
    if (code[i] === '}') depth++;
    else if (code[i] === '{') { if (depth === 0) break; depth--; }
    i--;
  }
  if (i < 0) return false;
  let j = caret;
  depth = 0;
  while (j < code.length) {
    if (code[j] === '{') depth++;
    else if (code[j] === '}') { if (depth === 0) break; depth--; }
    j++;
  }
  return !code.slice(i + 1, j).trim();
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ------------------------------------------------------------------ */
/* entry point                                                         */
/* ------------------------------------------------------------------ */

export function predict(text, caret, model, opts = {}) {
  if (!model) return null;
  if (caret !== text.length && restOfLine(text, caret).trim()) return null;

  const chip = opts.chip || 'ESP32';
  const lines = text.split('\n');
  const row = text.slice(0, caret).split('\n').length - 1;
  const lineStart = text.lastIndexOf('\n', caret - 1) + 1;
  const typed = text.slice(lineStart, caret);

  const tries = [
    () => predictArgs(text, caret, model, chip),
    () => predictRepetition(lines, row, typed),
    () => predictStatement(text, caret, model, chip),
  ];

  for (const attempt of tries) {
    let result = null;
    try { result = attempt(); } catch { result = null; }
    if (result && result.text && result.confidence >= FLOOR) {
      result.text = result.text.replace(/\s+$/, (m) => (m.includes('\n') ? m : ''));
      if (result.text) return result;
    }
  }
  return null;
}

export const CONFIDENCE_FLOOR = FLOOR;
