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
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? 'http://localhost:8000';
