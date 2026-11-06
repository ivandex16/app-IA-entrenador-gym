# Android setup (Capacitor)

This project now includes Capacitor and an Android native project under `client/android`.

## 1) Configure mobile API URL

Create `client/.env.android` from the example and set your public backend URL:

```bash
cp .env.android.example .env.android
```

Example:

```env
VITE_API_URL=https://your-backend-tunnel.ngrok-free.app/api
```

Note: Android app cannot use Vite dev proxy (`/api` -> localhost). It must call a real reachable URL.

## 2) Build web + sync native project

```bash
npm run android:sync
```

## 3) Open in Android Studio

```bash
npm run android:open
```

From Android Studio:
- wait for Gradle sync
- run on emulator/device
- or use Build > Build APK(s)

## Useful commands

```bash
npm run android:build-web
npm run android:sync
npm run android:run
```

