# Android packaging path (Capacitor)

## Prerequisites
- Node 20+
- Android Studio / SDK
- JDK 17

## Setup
```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android --save
npx cap init "AZRNOU" "dz.azrnou.app" --web-dir dist
npm run build
npx cap add android
npx cap copy android
npx cap open android
```

## Configuration
- `capacitor.config.ts` sets `appId: dz.azrnou.app`, `webDir: dist`
- Set production API URL via `VITE_API_URL` at build time
- Offline works via IndexedDB + service worker shell

## Notes
- No APK is committed; build locally or in CI with Android SDK.
