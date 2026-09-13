# AZRNOU Android (Capacitor)

## Package
- appId: see `capacitor.config.ts` (`dz.azrnou.app`)
- appName: AZRNOU
- webDir: `dist`

## Build-ready steps (requires Android SDK + Android Studio)
```bash
npm install
npm run build
npm install -D @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android
npx cap open android
```

## CI
Workflow verifies config + web build. **APK/AAB NOT generated** without Android SDK.

## Status
ANDROID SDK UNAVAILABLE on default GitHub ubuntu runners → **APK/AAB NOT generated in CI**.
