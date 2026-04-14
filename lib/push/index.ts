/**
 * Expo Push — token registration + foreground handler.
 *
 * Flow:
 *   1. On app launch (after login), call `registerForPushAsync()`.
 *   2. It asks for permission, obtains an ExpoPushToken, and stores it in
 *      AsyncStorage. It also POSTs the token to our backend so the server
 *      can target the user. (Backend endpoint TBD — noop for now.)
 *   3. Inside the app, foreground notifications surface as banners.
 *
 * For production we'll move to native FCM/APNs tokens, but Expo Push is
 * the fastest way to get notifications working on day 1.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../api/config';

const TOKEN_KEY = 'trezofin_expo_push_token';

// Foreground display: show banner + play sound + update badge
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushAsync(accessToken?: string | null): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators don't get tokens

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00d09c',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  await AsyncStorage.setItem(TOKEN_KEY, token);

  // Best-effort notify backend. Backend endpoint doesn't exist yet — this
  // is a no-op 404 for now and we silently ignore it.
  if (accessToken) {
    fetch(`${API_BASE}/api/v1/users/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token, platform: Platform.OS }),
    }).catch(() => { /* backend endpoint pending */ });
  }

  return token;
}
