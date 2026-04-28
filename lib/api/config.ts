import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };

/**
 * Backend base URL. Set via EXPO_PUBLIC_API_URL env var in dev, or via
 * `extra.apiUrl` in app.json for production builds.
 *
 * Note: on iOS simulator + Android emulator, "localhost" resolves to the
 * device itself, not your Mac. Use your LAN IP (e.g. http://192.168.1.6:8000)
 * when testing on a physical phone, or the Android emulator's special
 * 10.0.2.2 -> host mapping.
 */
// Strip any trailing slash so callers can safely concatenate
// `/api/v1/...` without producing `//api/v1/...` (a class of bug we
// hit on the backend's BSE_BASE_URL once — applying the same fix
// pre-emptively on the mobile side).
const _raw =
  process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? 'http://localhost:8000';
export const API_BASE = _raw.replace(/\/+$/, '');
