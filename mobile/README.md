# Azhagu Thinpandam — mobile app

React Native (Expo) app for Android and iPhone. It talks to the store's website
through `/api/v1` (see `src/app/api/v1` in the web project).

## Run it on your phone

1. Install **Expo Go** from the Play Store or App Store.
2. In the project root, start the website: `npm run dev`
3. In this folder, start the app: `npx expo start`
4. Scan the QR code (Android: inside Expo Go; iPhone: with the Camera app).

The phone and this computer must be on the same Wi-Fi. `.env.local` holds this
computer's address on that network (`EXPO_PUBLIC_API_URL`); update it if the
address changes (`ipconfig`), and allow Node through Windows Firewall when asked.
Delete `.env.local` to point the app at the live site instead.

See **TESTING.md** for the full test guide and troubleshooting.

## Checks

    npx tsc --noEmit
    npx expo lint
    npx expo-doctor

## Layout

- `src/app` — screens (Expo Router). `(tabs)` holds Home, Shop, Cart, Account.
- `src/lib` — API client, sign-in and cart stores, shared types, theme.
- `src/components` — shared UI.
