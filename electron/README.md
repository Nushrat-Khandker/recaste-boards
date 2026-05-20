# Recaste Desktop (Electron)

Thin Electron wrapper that loads the published web app and gives you
real OS pop-up notifications (macOS Notification Center, Windows toast,
Linux libnotify) — no browser permission prompt.

## One-time setup (on your own machine)

1. Export the project to GitHub from Lovable and clone it locally.
2. Install Node 20+.
3. From the project root:

   ```bash
   npm install
   npm install --save-dev electron @electron/packager
   ```

## Run in dev (loads the published site)

```bash
npx electron electron/main.cjs
```

To point it at a different URL (e.g. the Lovable preview):

```bash
RECASTE_URL="https://id-preview--be264359-5797-435c-9ba4-10eca8999ae9.lovable.app" npx electron electron/main.cjs
```

## Package a distributable

### macOS (.app / .zip)

```bash
npx @electron/packager . "Recaste" \
  --platform=darwin --arch=universal \
  --out=electron-release --overwrite \
  --ignore='^/src' --ignore='^/public' --ignore='^/supabase' \
  --ignore='^/electron-release'
```

### Windows (.exe folder)

```bash
npx @electron/packager . "Recaste" \
  --platform=win32 --arch=x64 \
  --out=electron-release --overwrite
```

The packaged app lives under `electron-release/`. Zip it up and share.

## Notes

- Notifications are fired by the web app itself via `new Notification(...)`
  (see `src/components/NotificationCenter.tsx`). Electron surfaces these
  natively, so they show up as system pop-ups even when the window is in
  the background.
- The wrapper only loads the production URL by default, so updates to the
  web app go live without re-shipping the desktop build.