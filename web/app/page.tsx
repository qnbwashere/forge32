'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const REPO = process.env.NEXT_PUBLIC_GH_REPO || '';

/* The pins along the left header of an ESP32-DevKitC, in board order. */
const PINS = [
  { name: '3V3', pwr: true },
  { name: 'GND', pwr: true },
  { name: 'EN' },
  { name: 'IO36' },
  { name: 'IO34' },
  { name: 'IO32' },
  { name: 'IO25' },
  { name: 'IO26' },
  { name: 'IO27' },
  { name: 'IO14' },
  { name: 'TX0' },
  { name: 'RX0' },
];

/* Actual esptool output from a successful flash. */
const LOG: { t: string; c?: string }[] = [
  { t: 'esptool.py v4.7.0' },
  { t: 'Serial port /dev/cu.usbserial-0001' },
  { t: 'Connecting......' },
  { t: 'Chip is ESP32-D0WD-V3 (revision v3.1)', c: 'k' },
  { t: 'Uploading stub...' },
  { t: 'Writing at 0x00010000... (100%)', c: 'k' },
  { t: 'Wrote 892336 bytes in 8.1 seconds' },
  { t: 'Hash of data verified.', c: 'g' },
  { t: 'Leaving...' },
  { t: 'Hard resetting via RTS pin...', c: 'a' },
];

const ARMED_AT = LOG.findIndex((l) => l.t.startsWith('Hash of data')) + 1;

type Key = 'mac-arm' | 'mac-intel' | 'win';

const TARGETS: Record<Key, { label: string; sub: string; href: string; file: string }> = {
  'mac-arm': { label: 'Download for macOS', sub: 'Apple silicon · .dmg', href: '/mac', file: 'FORGE32-mac-arm64.dmg' },
  'mac-intel': { label: 'Download for macOS', sub: 'Intel · .dmg', href: '/mac/intel', file: 'FORGE32-mac-x64.dmg' },
  win: { label: 'Download for Windows', sub: '64-bit · .exe installer', href: '/win', file: 'FORGE32-win-x64.exe' },
};

function detect(): Key | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/Win/i.test(ua)) return 'win';
  if (/Mac|iPhone|iPad/i.test(ua)) return 'mac-arm';
  return null;
}

function mb(bytes?: number) {
  return bytes ? `${Math.round(bytes / 1048576)} MB` : '';
}

export default function Page() {
  const [target, setTarget] = useState<Key | null>(null);
  const [shown, setShown] = useState(0);
  const [rel, setRel] = useState<{ tag?: string; sizes: Record<string, number> }>({ sizes: {} });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  /* platform, with a real architecture check where the browser offers one */
  useEffect(() => {
    setTarget(detect());
    const uaData = (navigator as any).userAgentData;
    if (uaData?.getHighEntropyValues && /Mac/i.test(navigator.userAgent)) {
      uaData
        .getHighEntropyValues(['architecture'])
        .then((v: any) => {
          if (v?.architecture && v.architecture !== 'arm') setTarget('mac-intel');
        })
        .catch(() => {});
    }
  }, []);

  /* boot log */
  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) {
      setShown(LOG.length);
      return;
    }
    timer.current = setInterval(() => {
      setShown((n) => {
        if (n >= LOG.length) {
          if (timer.current) clearInterval(timer.current);
          return n;
        }
        return n + 1;
      });
    }, 155);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  /* version and file size straight off the Releases page */
  useEffect(() => {
    if (!REPO) return;
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        const sizes: Record<string, number> = {};
        for (const a of d.assets || []) sizes[a.name] = a.size;
        setRel({ tag: d.tag_name, sizes });
      })
      .catch(() => {});
  }, []);

  const done = shown >= LOG.length;
  const armed = shown >= ARMED_AT;
  const t = target ? TARGETS[target] : null;
  const size = useMemo(() => (t ? mb(rel.sizes[t.file]) : ''), [t, rel]);

  return (
    <div className="wrap">
      <div className="board">
        <span className="hole tl" aria-hidden="true" />
        <span className="hole tr" aria-hidden="true" />
        <span className="hole bl" aria-hidden="true" />
        <span className="hole br" aria-hidden="true" />
        <span className="cap" aria-hidden="true" />

        <svg
          className="traces"
          aria-hidden="true"
          width="100%"
          height="100%"
          viewBox="0 0 400 700"
          preserveAspectRatio="none"
        >
          <polyline points="88,132 62,132 62,190 38,214" fill="none" stroke="#8a5a2e" strokeWidth="1.5" />
          <polyline points="88,236 72,236 72,274 98,300" fill="none" stroke="#8a5a2e" strokeWidth="1.5" />
          <polyline points="88,338 56,338 56,378" fill="none" stroke="#8a5a2e" strokeWidth="1.5" />
        </svg>

        <div className="board-grid">
        <aside className="rail" aria-hidden="true">
          {PINS.map((p) => (
            <div key={p.name} className={p.pwr ? 'pin pwr' : 'pin'}>
              <span>{p.name}</span>
              <i />
            </div>
          ))}
        </aside>

        <main className="hero">
          <div className="eyebrow">
            <span className="silk">ESP32 IDE</span>
            <span className="silk">{rel.tag ? rel.tag : 'unreleased'}</span>
          </div>

          <h1 className="mark">
            Forge<b>32</b>
          </h1>

          <p className="lede">
            Write, compile, flash and watch the serial monitor. The compiler, the uploader and the
            ESP32 board files all ship inside the installer, so there is{' '}
            <strong>nothing to configure</strong> before your first upload.
          </p>

          <section className="term" aria-label="Example upload output">
            <span className="screw tl" aria-hidden="true" />
            <span className="screw tr" aria-hidden="true" />
            <span className="screw bl" aria-hidden="true" />
            <span className="screw br" aria-hidden="true" />
            <div className="term-bar">
              <span className={done ? 'dot done' : 'dot live'} />
              <span className="silk">serial monitor · 115200 baud</span>
            </div>
            <div className="screen">
              <pre className="term-body">
                {LOG.slice(0, shown).map((l, i) => (
                  <span className={l.c ? `ln ${l.c}` : 'ln'} key={i}>
                    {l.t}
                  </span>
                ))}
                {!done && <span className="caret" />}
              </pre>
            </div>
          </section>

          <div className="cta-zone">
            <div className="cta-row">
            {t ? (
              <a className={armed ? 'cta armed' : 'cta'} href={t.href}>
                <span className="sw" aria-hidden="true">
                  <i />
                </span>
                <span className="cta-text">
                  <span className="cta-main">{t.label}</span>
                  <span className="cta-sub">
                    {t.sub}
                    {size ? ` · ${size}` : ''}
                  </span>
                </span>
              </a>
            ) : (
              <a className={armed ? 'cta armed' : 'cta'} href="/mac">
                <span className="sw" aria-hidden="true">
                  <i />
                </span>
                <span className="cta-text">
                  <span className="cta-main">Pick your download</span>
                  <span className="cta-sub">macOS and Windows builds below</span>
                </span>
              </a>
            )}

            <span className="usbc" aria-hidden="true" />
            </div>

            <nav className="alts">
              <span className="silk">All builds</span>
              <a href="/mac" data-here={target === 'mac-arm' ? '1' : '0'}>
                macOS Apple silicon
              </a>
              <a href="/mac/intel" data-here={target === 'mac-intel' ? '1' : '0'}>
                macOS Intel
              </a>
              <a href="/win" data-here={target === 'win' ? '1' : '0'}>
                Windows 64-bit
              </a>
            </nav>
          </div>

          {/* A genuine sequence, so the arrows between steps mean something. */}
          <section className="pipe">
            <article className="step">
              <div className="silk">Write</div>
              <h3>Suggestions as you type</h3>
              <p>
                Completion for the ESP32 Arduino API with signatures and inline docs, plus warnings
                when a pin you picked is input only or already taken by another line in the sketch.
              </p>
            </article>
            <article className="step">
              <div className="silk">Build</div>
              <h3>Compile with real output</h3>
              <p>
                Errors are linked to the line that caused them. Library search and install happen in
                the same window, and every board Espressif publishes is already listed.
              </p>
            </article>
            <article className="step">
              <div className="silk">Flash</div>
              <h3>Upload over USB</h3>
              <p>
                Ports refresh on their own as you plug boards in. Flash, erase and open the serial
                monitor without switching apps or guessing at a baud rate.
              </p>
            </article>
          </section>

          <section className="note">
            <div className="silk">First launch</div>
            <h2>What happens the first time you open it</h2>
            <ol>
              <li>
                FORGE32 downloads the ESP32 board support files, about 2 GB, and shows progress while
                it works. This runs once per computer and needs no input from you.
              </li>
              <li>
                Because the app is not signed with a paid developer certificate, macOS asks you to
                confirm. Right click the app and choose <code>Open</code>, once. On Windows, click{' '}
                <code>More info</code> then <code>Run anyway</code>, once.
              </li>
              <li>
                Plug in your board and pick it from the port list. ESP32-S3 and C3 boards need no
                driver. Older boards with a CH340 chip may need the WCH driver on macOS.
              </li>
            </ol>
          </section>

          <footer className="foot">
            <span>
              {rel.tag ? `${rel.tag} · ` : ''}MIT licensed · built on arduino-cli and esptool
            </span>
            <span>
              <a href="/source">Source</a>
            </span>
          </footer>
        </main>
        </div>
      </div>
    </div>
  );
}
