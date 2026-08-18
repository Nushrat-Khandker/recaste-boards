# Three fixes: service worker cache, paste-to-upload, mobile Messages

## 1. Service worker stale cache

- Add `public/_headers` with no-cache directives for `/sw.js` and `/registerSW.js`.
- Rename `public/sw.js` to `public/sw-v2.js` (content unchanged: `push` + `notificationclick` handlers).
- In `vite.config.ts` VitePWA config: `filename: "sw-v2.js"` and add `injectRegister: 'script'`.
- Update the client registration path to `/sw-v2.js` (push subscription code in `src/lib/push-notifications.ts` / `useAutoPushSubscribe`) so the browser registers the new file instead of the old one, and unregister any existing `/sw.js` registration on load so returning users drop the stale worker.

Note: `_headers` is a Netlify-style headers file, which matches the Netlify deploy on the Mac mini. It has no effect in Lovable preview.

## 2. Paste-to-upload images in chat

`src/components/chat/ChatInput.tsx` already has an `onPaste` handler that extracts clipboard files and routes them to `onFileUpload` (same bucket, same progress bar). Work here is to harden and verify it:

- Only intercept when a clipboard item's `type` starts with `image/`; plain text and mixed text paste falls through untouched.
- Keep the auto-naming for unnamed screenshot blobs (`pasted-<timestamp>.png`).
- Confirm the same input is used by both `/messages` (channels + DMs) and board/general chat, so a single fix covers all contexts.

## 3. Mobile Messages behaves like Slack

`src/pages/Messages.tsx` renders sidebar and conversation in one `grid grid-cols-1 md:grid-cols-[260px_1fr]`, so on mobile both stack and the page scrolls.

- Use `useIsMobile()` in `Messages.tsx`.
- Mobile: render either the list (`selection === null`) or the conversation (`selection !== null`) — never both. Conversation view is full-screen height with the channel/DM header pinned.
- Add a back chevron at the top-left of the mobile conversation header that clears `selection` and returns to the list.
- Desktop layout stays exactly as-is (side-by-side).
- Deep links (`?channel=`, `?dm=`) keep working: they set `selection`, which on mobile opens the conversation view directly.

## Technical notes

- Files touched: `public/_headers` (new), `public/sw-v2.js` (renamed), `vite.config.ts`, push registration module, `src/components/chat/ChatInput.tsx`, `src/pages/Messages.tsx`.
- No database or edge function changes.
- Git commits are handled outside this environment; I will make the code changes and you commit them.
