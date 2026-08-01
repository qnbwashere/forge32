# NovaESP

A desktop IDE for ESP32 boards. Write code, compile it, flash it over USB,
and watch the serial monitor — all without installing the Arduino IDE or a
separate toolchain first.

## Download

- **macOS (Apple Silicon):** [NovaESP-mac-arm64.dmg](https://github.com/qnbwashere/forge32/releases/latest/download/NovaESP-mac-arm64.dmg)
- **macOS (Intel):** [NovaESP-mac-x64.dmg](https://github.com/qnbwashere/forge32/releases/latest/download/NovaESP-mac-x64.dmg)
- **Windows:** [NovaESP-win-x64.exe](https://github.com/qnbwashere/forge32/releases/latest/download/NovaESP-win-x64.exe)

Those links always point at the latest release. See [all releases](https://github.com/qnbwashere/forge32/releases) for older versions.

## What it does

- **No toolchain to install.** arduino-cli and ESP32 board support ship inside the app. Open it, pick your board, hit upload.
- **Compile, flash, and monitor** over USB with real progress, not a spinner — the same live output you'd get from a terminal, animated.
- **A pin map that explains itself.** Click a GPIO and it shows what your code actually does with it — configured as an output, driven HIGH, read as a digital input — not just "used somewhere." It'll even guess what's wired to a pin from naming conventions like `LED_PIN` or `BUTTON_PIN`, and you can confirm or correct it; your answer is remembered per sketch.
- **Ask AI**, without an API key. If you already have Claude Code or Codex installed and signed in with your own subscription, NovaESP can hand it a plain-language instruction and show you a diff to review before anything is applied — no key to paste in, no separate billing.
- **A command palette, inline autocomplete, and a serial monitor** that all feel like they belong to one piece of software, not a themed fork of something else.

## Building it yourself

```bash
npm install
npm run dev       # runs the IDE's own web server, open http://localhost:4032
npm start         # boots the Electron desktop shell around it
```

See [SETUP.md](SETUP.md) for how the installers and the download site are built and shipped, and [CLAUDE.md](CLAUDE.md) for the project's internal layout and invariants.

## License

MIT
