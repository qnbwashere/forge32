# FORGE32

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
   `FORGE32-mac-arm64.dmg`, `FORGE32-mac-x64.dmg`, `FORGE32-win-x64.exe`.
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
7. **Do not touch `app/public/`.** That is the working IDE. Any redesign
   work belongs only in `web/app/page.tsx`, `web/app/layout.tsx`, and
   `web/app/globals.css`.

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
   `github.com/<owner>/forge32/releases/latest/download/FORGE32-mac-arm64.dmg`,
   and that location should resolve (not 404). Same for `/mac/intel` and
   `/win`. Load the site itself and confirm the version tag and file size
   render, which means the client side call to the GitHub releases API is
   working.

## The design system in `globals.css`

The download page is built as a physical object: a PCB resting on an ESD
mat, lit from a single source at the top left. Every bevel, highlight and
shadow in the file agrees with that light, light edges on top and left,
shadows on bottom and right. If you add anything new here, check it against
that rule before committing it.
