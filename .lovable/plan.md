

## Push Notifications - Complete Setup

### Current State
The code infrastructure is already built (edge function, service worker, toggle component, database table). The missing piece is the **VAPID keys** — two text strings that browsers require to verify push notifications come from your app.

### What I Can Do
I don't have the ability to generate or store secrets directly. But here's exactly what you need to do — it's just two steps:

### Step 1: Generate the Keys
Go to any terminal (or ask someone technical) and run:
```
npx web-push generate-vapid-keys
```
This prints two strings — a **Public Key** and a **Private Key**.

### Step 2: Save Them in Supabase
1. Go to your [Supabase Edge Function Secrets page](https://supabase.com/dashboard/project/usdhemikpmbcuwearsob/settings/functions)
2. Add two secrets:
   - Name: `VAPID_PUBLIC_KEY` → paste the Public Key
   - Name: `VAPID_PRIVATE_KEY` → paste the Private Key
3. Click Save

That's it. After that, the push notification toggle in your app header will work — users can enable notifications and receive them on both mobile (PWA) and desktop browsers.

### What Already Works Without Keys
- The toggle UI in the header
- The service worker registration
- The database trigger that fires on new notifications

### What the Keys Enable
- Actually delivering push messages to users' devices
- The browser permission prompt when toggling on

### Native App (Capacitor)
For the native iOS/Android app via Capacitor, push notifications require additional setup (Firebase Cloud Messaging for Android, APNs for iOS) which is separate from the web push flow. The current setup covers PWA and browser notifications. If you want native app push too, let me know and I can plan that separately.

