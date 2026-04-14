# Trezofin AI — Mobile

React Native (Expo) app for Trezofin AI. One codebase → iOS + Android.

- **Bundle ID:** `ai.trezofin.app` (iOS + Android)
- **Display name:** Trezofin AI
- **Backend:** reuses the existing FastAPI backend (`trezofin_ai_backend`) — no backend changes.

## Stack

| Area | Choice |
|------|--------|
| Framework | Expo SDK 54 + React Native 0.81 + React 19 |
| Navigation | Expo Router (file-based, like Next.js) |
| Styling | NativeWind v4 (Tailwind class names in RN) |
| Animation | React Native Reanimated v4 (native-thread 60/120fps) |
| Audio | `expo-audio` (mic capture + playback) |
| Auth | Supabase JS v2 + `expo-secure-store` for token persistence (Keychain / Keystore) |
| Theming | Light + Dark, follows system setting by default (see `lib/theme`) |
| Icons | `lucide-react-native` + `react-native-svg` |
| Build + submit | EAS (Expo Application Services) |

## First run

```bash
# 1. Install deps (already done once during scaffold)
npm install

# 2. Copy .env.example → .env and fill in the three vars
cp .env.example .env

# 3. Start the Metro bundler
npx expo start
```

Then either:
- Open **Expo Go** on your phone and scan the QR code.
- Press `i` to launch the iOS simulator (requires Xcode).
- Press `a` to launch the Android emulator (requires Android Studio).

> When running on a physical phone, set `EXPO_PUBLIC_API_URL` to your
> Mac's LAN IP (e.g. `http://192.168.1.6:8000`), not `localhost` — the
> phone resolves `localhost` to itself.

## Project layout

```
app/                       Expo Router screens (file-based routing)
  _layout.tsx              Root layout + auth gate + theme
  auth/
    login.tsx              Email/password sign-in
  (tabs)/
    _layout.tsx            Bottom tabs
    index.tsx              Dashboard (Home)
    funds.tsx              Funds list
    chat.tsx               Text chat
    profile.tsx            Account & settings

components/
  voice/
    VoiceBar.tsx           Hero voice component (placeholder — full build next)

lib/
  api/
    config.ts              API_BASE (env-driven)
    ai.ts                  transcribe / chat / speak / voice-context
    client.ts              profile / funds / watchlist
  supabase/
    client.ts              Supabase client with SecureStore session storage
  theme/
    index.ts               Light + Dark theme tokens
    ThemeProvider.tsx      useTheme() hook, follows system setting
  constants/
    languages.ts
    speakers.ts
```

## Roadmap to v1 on stores

1. ✅ Scaffold + auth + dashboard shell running on-device (this commit)
2. VoiceBar — mic capture + STT→chat→TTS pipeline + reactive waveform + thinking ring
3. DashboardChat — text-only multilingual chat
4. Funds list + search + invest/order flow
5. EAS build + TestFlight / Play Internal Testing
6. Store listing copy, screenshots, privacy policy
7. Submit to App Store + Play Store

## Deploying (EAS)

```bash
npm i -g eas-cli
eas login
eas build:configure

# Build both platforms in parallel
eas build --platform all --profile production

# Submit to App Store + Play Console
eas submit --platform all
```
