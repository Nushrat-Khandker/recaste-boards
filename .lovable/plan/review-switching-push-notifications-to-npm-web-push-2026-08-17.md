# Review: switching push-notifications to `npm:web-push`

## Verdict

The handler logic in your version is fine — it is identical to what is deployed today (actions, recipient scoping, tag, 410/404 cleanup). The only real change is swapping the native Web Crypto encryption for `npm:web-push@3.6.7`, and that swap is the risky part on this project.

Three concerns:

1. **Self-hosted network restriction.** The functions run on the Mac mini instance that cannot reach `esm.sh`. `npm:` specifiers resolve through the same kind of outbound registry fetch (registry.npmjs.org) at first boot. If that host is also blocked, the function fails to start entirely instead of just failing a push.
2. **`web-push` needs Node built-ins.** It relies on `crypto`, `https`, and `url`. Under Deno's npm compatibility layer this usually works, but on a self-hosted edge-runtime image it is a common source of boot-time failures — and the failure mode is a dead function, not a degraded one.
3. **The current native implementation is already correct.** The earlier silent-drop bug (swapped HKDF salt/IKM per RFC 8291) was fixed; the deployed code follows RFC 8291/8188 properly. Replacing working code with a dependency does not buy new behaviour here.

One genuine advantage of `web-push`: it handles VAPID and encryption edge cases for you, so future maintenance is simpler — but only if it boots reliably on the self-hosted runtime.

## Recommendation

Keep the native implementation as the default, and verify the `web-push` variant on the Mac mini before making it the shipped version.

## Plan

1. Leave `supabase/functions/push-notifications/index.ts` on the current native Web Crypto implementation.
2. Add a throwaway probe function (`supabase/functions/push-probe/index.ts`) that only does `import webpush from "npm:web-push@3.6.7"` and returns `{ ok: true }`. Deploy it to the self-hosted instance with the existing deploy script and hit it once.
   - If it returns `ok` → the `npm:` route works on that runtime, and we can switch `push-notifications` over to your version and delete the probe.
   - If it errors on boot → we stay native, and the probe is deleted.
3. Independently of the above, if notifications are still not arriving, the cause is more likely downstream of encryption: the `send_push_on_notification` trigger firing, the stored subscription rows, or the service worker. Confirm by calling the `broadcast` action directly and reading the `sent`/`failed` counts in the function logs.

## Technical notes

- No database changes.
- No frontend changes; `src/lib/push-notifications.ts` and `public/sw-push.js` stay as they are.
- If we do switch, `sendWebPush` should keep re-using `setVapidDetails` once at module scope rather than on every call — calling it per push is harmless but wasteful.
- `deploy-to-self-hosted.sh` needs the probe name added temporarily, then removed.
