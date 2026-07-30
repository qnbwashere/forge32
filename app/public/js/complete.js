/* The completion engine.
 * Works out what you are typing, gathers candidates from the symbol database
 * and from your own sketch, then ranks them.
 */

import {
  ALL_GLOBAL, GLOBALS, CONSTANTS, TYPES, KEYWORDS, SNIPPETS, HEADERS,
  INSTANCES, TYPE_ALIASES, MEMBERS, membersFor, TYPE_INCLUDES, INSTANCE_INCLUDES,
} from './symbols.js';

/* ------------------------------------------------------------------ */
/* fuzzy matching                                                      */
/* ------------------------------------------------------------------ */

/** Score a candidate against what has been typed. Higher is better, null means no match. */
export function fuzzyScore(needle, haystack) {
  if (!needle) return { score: 1, positions: [] };
  const n = needle.length, h = haystack.length;
  if (n > h) return null;

  const lowNeedle = needle.toLowerCase();
  const lowHay = haystack.toLowerCase();

  /* exact prefix is always the strongest signal */
  if (lowHay.startsWith(lowNeedle)) {
    const exactCase = haystack.startsWith(needle);
    return {
      score: 1000 - h + (exactCase ? 60 : 0) + (h === n ? 100 : 0),
      positions: Array.from({ length: n }, (_, i) => i),
    };
  }

  /* acronym match, so dw finds digitalWrite and gfh finds getFreeHeap */
  const caps = [];
  for (let i = 0; i < h; i++) {
    if (i === 0 || haystack[i] === '_' || /[A-Z]/.test(haystack[i])) {
      const at = haystack[i] === '_' ? i + 1 : i;
      if (at < h) caps.push(at);
    }
  }
  if (caps.length >= n) {
    let ci = 0; const pos = [];
    for (let i = 0; i < n && ci < caps.length; ) {
      if (lowHay[caps[ci]] === lowNeedle[i]) { pos.push(caps[ci]); i++; }
      ci++;
      if (pos.length === n) break;
    }
    if (pos.length === n) return { score: 700 - h, positions: pos };
  }

  /* subsequence, rewarding runs and early hits */
  let hi = 0, run = 0, score = 300 - h;
  const pos = [];
  for (let i = 0; i < n; i++) {
    let found = -1;
    for (let j = hi; j < h; j++) {
      if (lowHay[j] === lowNeedle[i]) { found = j; break; }
    }
    if (found < 0) return null;
    if (found === hi && i > 0) { run++; score += 12 + run * 4; } else { run = 0; score -= 2; }
    if (found > 0 && (haystack[found - 1] === '_' || /[a-z]/.test(haystack[found - 1]) && /[A-Z]/.test(haystack[found]))) score += 8;
    pos.push(found);
    hi = found + 1;
  }
  return { score, positions: pos };
}

/* ------------------------------------------------------------------ */
/* what is being typed                                                 */
/* ------------------------------------------------------------------ */

const IDENT = /[A-Za-z_]\w*$/;

export function contextAt(text, caret) {
  const before = text.slice(0, caret);
  const lineStart = before.lastIndexOf('\n') + 1;
  const line = before.slice(lineStart);

  /* inside an include directive */
  const inc = /^\s*#\s*include\s*([<"])([^>"\n]*)$/.exec(line);
  if (inc) {
    return {
      kind: 'include', prefix: inc[2], open: inc[1],
      start: caret - inc[2].length, end: caret, line, lineStart,
    };
  }

  /* preprocessor directive name */
  const pre = /^\s*(#\s*\w*)$/.exec(line);
  if (pre) {
    return { kind: 'directive', prefix: pre[1].replace(/\s+/g, ''), start: lineStart + line.indexOf('#'), end: caret, line, lineStart };
  }

  /* member access through . or -> or :: */
  const mem = /([A-Za-z_]\w*)\s*(\.|->|::)\s*(\w*)$/.exec(before);
  if (mem) {
    const prefix = mem[3];
    return {
      kind: 'member', object: mem[1], op: mem[2], prefix,
      start: caret - prefix.length, end: caret, line, lineStart,
    };
  }

  const id = IDENT.exec(before);
  const prefix = id ? id[0] : '';
  return { kind: 'ident', prefix, start: caret - prefix.length, end: caret, line, lineStart };
}

/* ------------------------------------------------------------------ */
/* candidate gathering                                                 */
/* ------------------------------------------------------------------ */

function typeOfObject(name, model) {
  if (INSTANCES[name]) return INSTANCES[name];
  const v = model?.vars?.get(name);
  if (v) {
    const bare = v.type.replace(/\s*\*|\s*&/g, '').replace(/<.*>/, '').trim();
    return TYPE_ALIASES[bare] || bare;
  }
  if (MEMBERS[name]) return name;
  if (TYPE_ALIASES[name]) return TYPE_ALIASES[name];
  return null;
}

function userItems(model) {
  const items = [];
  if (!model) return items;
  for (const [name, v] of model.vars) {
    items.push({
      name, kind: v.isConst ? 'const' : 'var',
      sig: v.type + ' ' + name,
      doc: (v.global ? 'Declared in this sketch on line ' : 'Local, line ') + (v.line + 1) + '.',
      local: true,
    });
  }
  for (const [name, f] of model.funcs) {
    if (name === 'setup' || name === 'loop') continue;
    items.push({
      name, kind: 'func', sig: f.sig,
      doc: 'Defined in this sketch on line ' + (f.line + 1) + '.',
      insert: name + '(' + (f.args.trim() ? '${1}' : '') + ')$0',
      local: true,
    });
  }
  for (const [name, m] of model.macros) {
    items.push({
      name, kind: 'macro',
      sig: '#define ' + name + (m.value ? ' ' + m.value : ''),
      doc: 'Defined in this sketch on line ' + (m.line + 1) + '.',
      local: true,
    });
  }
  for (const e of model.enums) {
    items.push({ name: e.name, kind: 'const', doc: 'Member of enum ' + (e.enumName || 'in this sketch') + '.', local: true });
  }
  return items;
}

const KIND_WEIGHT = {
  var: 34, macro: 30, func: 26, snippet: 24, method: 22,
  const: 16, object: 14, type: 10, keyword: 4, header: 20, directive: 4,
};

export function complete(text, caret, model, opts = {}) {
  const ctx = contextAt(text, caret);
  let pool;

  if (ctx.kind === 'include') {
    pool = HEADERS.slice();
    const known = new Set(HEADERS.map((h) => h.name));
    for (const lib of opts.installedLibraries || []) {
      for (const h of lib.includes || []) {
        if (!known.has(h)) { known.add(h); pool.push({ name: h, kind: 'header', doc: 'From the installed library ' + lib.name + '.' }); }
      }
    }
  } else if (ctx.kind === 'directive') {
    pool = KEYWORDS.filter((k) => k.name.startsWith('#'));
  } else if (ctx.kind === 'member') {
    const type = typeOfObject(ctx.object, model);
    const members = membersFor(type);
    if (!members) {
      /* Unknown object. Offer nothing rather than a wrong list. */
      return { items: [], ctx, unknownObject: ctx.object, type };
    }
    pool = members.map((m) => ({ ...m, owner: ctx.object }));
  } else {
    pool = [...ALL_GLOBAL, ...userItems(model)];
    /* de-duplicate, letting the sketch win over the built in list */
    const byName = new Map();
    for (const item of pool) {
      const prev = byName.get(item.name);
      if (!prev || (item.local && !prev.local)) byName.set(item.name, item);
    }
    pool = [...byName.values()];
  }

  const out = [];
  for (const item of pool) {
    const hit = fuzzyScore(ctx.prefix, item.name);
    if (!hit) continue;
    let score = hit.score + (KIND_WEIGHT[item.kind] || 0);
    if (opts.recent?.includes(item.name)) score += 45;
    if (item.kind === 'snippet' && ctx.prefix.length < 2) score -= 30;
    out.push({ ...item, score, positions: hit.positions });
  }

  out.sort((a, b) => b.score - a.score || a.name.length - b.name.length || a.name.localeCompare(b.name));
  return { items: out.slice(0, opts.limit || 40), ctx };
}

/* ------------------------------------------------------------------ */
/* what to insert                                                      */
/* ------------------------------------------------------------------ */

export function insertionFor(item, ctx) {
  if (ctx.kind === 'include') {
    const close = ctx.open === '<' ? '>' : '"';
    return { text: item.name + close, tabStops: [] };
  }
  let template = item.insert;
  if (!template) {
    if (item.kind === 'func' || item.kind === 'method') template = item.name + '(${1})$0';
    else template = item.name + '$0';
  } else if (ctx.kind === 'member' && item.kind === 'method') {
    /* member templates already start at the method name */
  }
  return parseTemplate(template);
}

/** Turn ${1:foo} and $0 markers into plain text plus tab stop ranges. */
export function parseTemplate(template) {
  const stops = new Map();
  let text = '';
  let i = 0;
  const re = /\$(\d+)|\$\{(\d+)(?::([^}]*))?\}/g;
  let m;
  while ((m = re.exec(template))) {
    text += template.slice(i, m.index);
    const num = Number(m[1] ?? m[2]);
    const placeholder = m[3] ?? '';
    const start = text.length;
    text += placeholder;
    if (!stops.has(num)) stops.set(num, []);
    stops.get(num).push({ start, end: start + placeholder.length });
    i = m.index + m[0].length;
  }
  text += template.slice(i);

  const nums = [...stops.keys()].sort((a, b) => (a === 0 ? 1 : b === 0 ? -1 : a - b));
  const tabStops = nums.map((n) => ({ n, ranges: stops.get(n) }));
  return { text, tabStops };
}

/** Header this item needs, when the sketch does not already include it. */
export function neededInclude(item, model) {
  const inc = item.include || TYPE_INCLUDES[item.name] || INSTANCE_INCLUDES[item.name] ||
    (item.owner ? INSTANCE_INCLUDES[item.owner] : null) ||
    (item.owner && model?.vars?.get(item.owner)
      ? TYPE_INCLUDES[model.vars.get(item.owner).type.replace(/\s*\*|\s*&/g, '').trim()]
      : null);
  if (!inc) return null;
  const have = new Set((model?.includes || []).map((h) => h.name));
  if (have.has(inc)) return null;
  /* WiFi.h covers the secure and multi variants */
  if (inc === 'WiFi.h' && [...have].some((h) => /^WiFi/.test(h))) return null;
  return inc;
}

/** Where a new include line should go, and what it should say. */
export function includeInsertion(header, text) {
  const lines = text.split('\n');
  let last = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*#\s*include\b/.test(lines[i])) last = i;
    if (/^\s*(void|int|bool|float|double|char|uint|static|class|struct)\b/.test(lines[i]) && last >= 0) break;
  }
  const line = '#include <' + header + '>';
  if (last >= 0) return { line, at: last + 1 };
  /* no includes yet, so go above the first comment free line of code */
  let at = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(\/\/|\/\*|\*|$)/.test(lines[i])) continue;
    at = i; break;
  }
  return { line, at, blankAfter: true };
}

/* ------------------------------------------------------------------ */
/* signature help                                                      */
/* ------------------------------------------------------------------ */

const ALL_CALLABLE = [...GLOBALS, ...SNIPPETS];

export function signatureAt(text, caret, model) {
  let depth = 0, i = caret - 1, argIndex = 0, guard = 0;
  while (i >= 0 && guard++ < 6000) {
    const c = text[i];
    if (c === ')') depth++;
    else if (c === '(') {
      if (depth === 0) break;
      depth--;
    } else if (c === ',' && depth === 0) argIndex++;
    else if (c === ';' || c === '{' || c === '}') return null;
    i--;
  }
  if (i < 0 || text[i] !== '(') return null;

  const before = text.slice(0, i);
  const nameMatch = /([A-Za-z_]\w*)\s*$/.exec(before);
  if (!nameMatch) return null;
  const name = nameMatch[1];

  const dot = /([A-Za-z_]\w*)\s*(?:\.|->|::)\s*$/.exec(before.slice(0, nameMatch.index));
  let item = null;
  if (dot) {
    const members = membersFor(typeOfObject(dot[1], model));
    item = members?.find((m) => m.name === name) || null;
  }
  if (!item) item = ALL_CALLABLE.find((f) => f.name === name) || null;
  if (!item && model?.funcs?.has(name)) {
    const f = model.funcs.get(name);
    item = { name, sig: f.sig, doc: 'Defined in this sketch on line ' + (f.line + 1) + '.' };
  }
  if (!item || !item.sig) return null;

  return { item, argIndex, params: splitParams(item.sig), open: i };
}

/** Pull the parameter list out of a signature string. */
export function splitParams(sig) {
  const open = sig.indexOf('(');
  const close = sig.lastIndexOf(')');
  if (open < 0 || close < open) return [];
  const inner = sig.slice(open + 1, close);
  if (!inner.trim()) return [];
  const parts = [];
  let depth = 0, cur = '';
  for (const c of inner) {
    if (c === '<' || c === '(') depth++;
    if (c === '>' || c === ')') depth--;
    if (c === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}
