# Building the Android APK (Capacitor)

The project already has Capacitor wired up (`capacitor.config.json`). Follow these steps **on your local machine** (not inside Lovable) to produce an installable `.apk`.

## Prerequisites

- Node 18+ and `npm` / `bun`
- Android Studio (includes the Android SDK + JDK 17)
- Set `ANDROID_HOME` to your SDK path (Android Studio → SDK Manager)

## One-time setup

```bash
# 1. Pull the repo (via GitHub export from Lovable) and install deps
npm install

# 2. Point Capacitor at a production build instead of the live preview.
#    Edit capacitor.config.json and REMOVE the "server" block, or replace
#    its url with your published domain (https://kanban.recaste.com).

# 3. Build the web assets
npm run build

# 4. Add the Android platform (creates the /android folder)
npx cap add android
npx cap sync android
```

## Build the APK

```bash
# Open in Android Studio (easiest)
npx cap open android
# → Build menu → "Build Bundle(s) / APK(s)" → "Build APK(s)"

# OR command line
cd android
./gradlew assembleDebug
# APK appears at android/app/build/outputs/apk/debug/app-debug.apk
```

## Push notifications on Android

Native push uses Firebase Cloud Messaging (FCM):

1. Create a Firebase project → add Android app with package id `app.lovable.be2643595797435c9ba410eca8999ae9`.
2. Download `google-services.json` and drop it into `android/app/`.
3. Re-sync: `npx cap sync android`, then rebuild.

The app already initialises `@capacitor/push-notifications` and `@capacitor/local-notifications` (see `src/lib/native-notifications.ts`). Even without FCM configured, local notifications will fire while the app is open.

## Updating after code changes

```bash
npm run build && npx cap sync android
```

Then rebuild the APK from Android Studio or Gradle.