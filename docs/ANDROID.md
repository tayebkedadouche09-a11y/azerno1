# Android (Capacitor)

```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android --save
npm run build
npx cap add android
npx cap copy android
npx cap open android
```

- App ID: `dz.azrnou.app`
- Set `VITE_API_URL` at build time for production API.
- Offline: IndexedDB queue + service worker shell.
