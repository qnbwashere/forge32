# Shipping FORGE32

Two hosts, each doing what it is good at:

- **GitHub Releases** stores the installers. Free, no bandwidth cap worth worrying about, and it gives every asset a permanent URL.
- **Vercel** serves the download page and forwards `/mac` and `/win` straight to those assets.

Vercel caps a deployment at 100 MB and is not meant to host binaries, which is why the installers do not live there.

---

## 1. Push the repo

```bash
cd forge32
git init && git add -A
git commit -m "FORGE32"
git branch -M main
git remote add origin https://github.com/qnbwashere/forge32.git
git push -u origin main
```

Repo can be private, but then release assets need a token to download. Public is simpler.

## 2. Build the installers

```bash
git tag v1.0.0
git push origin v1.0.0
```

That triggers `.github/workflows/release.yml`, which runs three jobs in parallel and takes roughly 8 minutes:

| Job | Runner | Output |
|---|---|---|
| macOS Apple silicon | macos-14 | `FORGE32-mac-arm64.dmg` |
| macOS Intel | macos-14 | `FORGE32-mac-x64.dmg` |
| Windows | windows-latest | `FORGE32-win-x64.exe` |

Each job downloads the matching `arduino-cli` build and packages it inside the app, so the installed IDE has a working compiler and uploader with nothing else to install.

The filenames deliberately carry **no version number**. That is what makes `releases/latest/download/FORGE32-mac-arm64.dmg` a permanent URL, so the website never needs updating when you cut a release.

## 3. Deploy the site

```bash
npm i -g vercel
cd web
vercel --prod
```

Or import the repo at vercel.com and set **Root Directory** to `web`.

Then set one environment variable, in Vercel under Settings → Environment Variables:

```
NEXT_PUBLIC_GH_REPO = qnbwashere/forge32
```

Redeploy after adding it. That single variable drives both the redirects and the version and file size shown on the page.

## 4. Use it

On any computer, open your Vercel URL. The page detects the platform and the button downloads the right installer. Or skip the page entirely:

- `your-site.vercel.app/mac` — Apple silicon
- `your-site.vercel.app/mac/intel` — Intel Mac
- `your-site.vercel.app/win` — Windows

Those are single 307 redirects, so the download starts on load. Nothing to click, no JavaScript needed.

---

## Two things that are not fully automatic

I would rather name these than let you find them on a new laptop.

**The unsigned app warning.** Apple charges $99 a year for a developer certificate and Windows code signing certificates run $200 to $400 a year. Without them the OS asks for confirmation the first time:

- macOS: right click the app → **Open** → **Open**. Once, per machine. If Sequoia or later refuses outright, `xattr -dr com.apple.quarantine /Applications/FORGE32.app` clears it.
- Windows: **More info** → **Run anyway**. Once.

For your own machines this is a two second annoyance. If you ever hand the app to strangers, that is when the certificates start being worth the money. To add notarization later: set `identity` in `electron-builder.yml`, add `notarize: true`, and put `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` into repo secrets.

**The 2 GB first run.** The ESP32 board support package is far too large to bundle, so the app fetches it on first launch with a progress screen. Automatic, but it needs internet and a few minutes once per computer.

## Serial drivers

- ESP32-S3, S2 and C3 talk over native USB. No driver, ever.
- Classic ESP32 with a CP2102 chip: Windows 10 and 11 install it themselves, macOS 11+ has it built in.
- Boards with a CH340 or CH9102 chip sometimes need the WCH driver on macOS.

## Local development

```bash
npm install          # electron + builder
npm run dev          # just the IDE server, browser at :4032
npm start            # the full desktop app
npm run pack:mac     # build a local dmg without releasing
```

`npm run dev` needs `arduino-cli` on your PATH or in `bin/`. Add `--mock` to the server to click through the interface without a board attached.
