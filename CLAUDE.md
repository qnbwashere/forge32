# NovaESP

A desktop IDE for ESP32 boards. Write code, compile it, flash it over USB,
and watch the serial monitor, all without installing the Arduino IDE or a
separate toolchain.

## Layout

```
forge32/
  app/                      the IDE itself
    server.js               Node server wrapping arduino-cli, CommonJS, no deps
    public/index.html        the whole editor UI, one file
    public/js/*.js            autocomplete, prediction, pin data, symbol scanning
  electron/main.js          desktop shell, boots app/server.js as a child process
  electron-builder.yml      packaging config
  .github/workflows/release.yml   builds the Mac and Windows installers
  web/                      the Next.js download site, deploys to Vercel
    app/page.tsx             the download page (skeuomorphic PCB redesign)
    app/layout.tsx           root layout, fonts, metadata, favicon
    app/globals.css          all the visual design lives here
  bin/                      arduino-cli lands here during CI, empty in git
```

## Invariants

These are load bearing. Breaking any of them silently breaks the download
links.

1. **Installer filenames carry no version number.** They are exactly
   `NovaESP-mac-arm64.dmg`, `NovaESP-mac-x64.dmg`, `NovaESP-win-x64.exe`.
   That is what makes `releases/latest/download/<name>` a permanent URL.
   `electron-builder.yml` and `web/next.config.mjs` both depend on these
   exact strings matching.
2. **The redirects in `next.config.mjs` stay 307, not 308.** The release
   asset a redirect points at changes every release and must never be
   cached by a browser.
3. **`NEXT_PUBLIC_GH_REPO` is the only place the repo name lives.** Do not
   hardcode `owner/forge32` anywhere in `web/app`.
4. **Do not downgrade Next.js.** It is on 16 with React 19.
5. **Fonts are self hosted through `@fontsource`.** Do not reintroduce a
   Google Fonts link.
6. **`app/server.js` is CommonJS and dependency free.** Do not convert it
   to ESM or add packages to it.
7. **In `app/public/index.html`, the CSS can be restyled, the rest cannot.**
   The IDE's visual language now matches the website: hardware panel,
   chrome knobs, glowing LEDs, domed gold pads. Only the `<style>` block
   (and small additive, non-functional touches) should change. Never
   rename or remove an element `id`, never restructure the DOM the script
   below relies on, and never touch `public/js/*.js` for a visual change.
   Test in a browser after any edit here: open the sketch, type to trigger
   autocomplete, switch console tabs, click a pin. All of it should still
   work exactly as before, just look different.
8. **`app/public/index.html`'s frontend and `app/server.js`'s routes are a
   contract.** The IDE talks to the backend through one ndjson streaming
   protocol (see `streamApi()` in the script, `openStream()` on the
   server): every long running action -- setup, compile, upload, lib
   install/uninstall, erase, monitor -- POSTs once and reads a stream of
   `{t: ...}` events off the response body. There is no job-id/EventSource
   model anywhere in this app; don't reintroduce one. If you add a new
   backend route or change a response shape, grep the other side and
   update it in the same change, then actually exercise it (curl or a
   headless browser), because a mismatch here fails silently until a user
   clicks the button.
9. **`package.json`'s `"version"` must be bumped for every release, and it
   is the only version number that matters.** electron-builder generates
   `latest.yml` / `latest-mac.yml` (the files electron-updater polls) from
   this field, not from the git tag. Tagging `v1.0.3` while `package.json`
   still says `1.0.2` ships an installer that electron-updater considers
   identical to the last one -- it will never offer itself as an update.
   Always bump this in the same commit that prepares a release.

## Running locally

```bash
npm run dev       # runs app/server.js, the IDE's own web server
npm start         # boots the Electron desktop shell around it
npm run pack:mac  # builds an unsigned local .dmg with electron-builder
```

For the website:

```bash
cd web
npm install
npm run dev       # next dev
```

## Deploy procedure

1. Push to `main`. Tag a release to build installers:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

   That triggers `.github/workflows/release.yml`: three parallel jobs
   (macOS Apple silicon, macOS Intel, Windows), each fetching the matching
   `arduino-cli` build and packaging it into the installer, then publishing
   the three fixed filenames to the GitHub Release for that tag.

2. Deploy the site. The Vercel project root is `web`, not the repo root.

   ```bash
   cd web
   vercel link
   vercel env add NEXT_PUBLIC_GH_REPO production   # value: <owner>/forge32
   vercel env add NEXT_PUBLIC_GH_REPO preview
   vercel env add NEXT_PUBLIC_GH_REPO development
   vercel --prod
   ```

   Connect the repo in the Vercel dashboard with root directory `web` so
   pushes to `main` redeploy automatically.

3. Verify the chain: `curl -sI https://<site>/mac` should return 307 with a
   `location` pointing at
   `github.com/<owner>/forge32/releases/latest/download/NovaESP-mac-arm64.dmg`,
   and that location should resolve (not 404). Same for `/mac/intel` and
   `/win`. Load the site itself and confirm the version tag and file size
   render, which means the client side call to the GitHub releases API is
   working.

## Auto-update

`electron/main.js` runs `checkForUpdates()` once, right after the main
window opens (packaged builds only; dev runs skip it). Two paths, in order:

1. **`electron-updater`**, configured against the `publish` block in
   `electron-builder.yml` (GitHub releases, owner/repo `qnbwashere/forge32`).
   This is a real silent updater: it downloads the new installer in the
   background and, once ready, asks the user to restart. On Windows this
   works unsigned. On macOS, Squirrel.Mac's silent apply is only reliable
   for a signed/notarized app, and NovaESP currently ships ad hoc signed
   only (see SETUP.md) -- so on macOS this path is best effort, not a
   promise, until real notarization is set up.
2. **A plain HTTPS fallback** (`checkForUpdatesFallback()`), hitting
   `api.github.com/repos/qnbwashere/forge32/releases/latest` directly with
   Node's built-in `https`, comparing `tag_name` against `app.getVersion()`.
   This never downloads or installs anything -- it only shows a "new
   version available, click to download" dialog with a direct link. It
   fires if `electron-updater` errors, and also unconditionally ~15s after
   launch as insurance, specifically to cover the case where the silent
   path on an unsigned mac build neither errors nor actually applies. It is
   idempotent per launch (`fallbackCheckInFlight` while a check is running,
   `fallbackSucceeded` once one has shown a dialog this launch), and is
   skipped entirely if the silent path already got as far as downloading
   an update.

Anyone currently on a build from before this feature shipped (v1.0.2 or
earlier without it) has no updater code at all and must reinstall once by
hand. Every release after that should update itself on Windows, and should
at minimum notify-with-a-link on macOS even in the worst case.

## The design system in `globals.css`

The download page is built as a physical object: a PCB resting on an ESD
mat, lit from a single source at the top left. Every bevel, highlight and
shadow in the file agrees with that light, light edges on top and left,
shadows on bottom and right. If you add anything new here, check it against
that rule before committing it.
