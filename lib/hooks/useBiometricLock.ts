/**
 * Biometric app lock — Face ID / Touch ID / Android BiometricPrompt.
 *
 * Behaviour:
 *  - If the user has enabled it (Profile toggle, persisted in AsyncStorage)
 *    we prompt on app launch AND after the app has been backgrounded for
 *    longer than LOCK_AFTER_MS.
 *  - Lock state is a simple boolean; the root layout renders a full-screen
 *    lock overlay until it's cleared.
 *  - We intentionally do NOT lock on every tap-background: that's annoying
 *    for a user who briefly checks a notification and comes back.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LA from 'expo-local-authentication';

const ENABLED_KEY = 'trezofin_biometric_enabled';
const LOCK_AFTER_MS = 30_000; // lock again if backgrounded for 30s+

export function useBiometricLock() {
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked]        = useState(false);
  const [available, setAvailable]  = useState(false);
  const bgTsRef = useRef<number | null>(null);

  // Initial load
  useEffect(() => {
    (async () => {
      const [has, enrolled] = await Promise.all([
        LA.hasHardwareAsync(),
        LA.isEnrolledAsync(),
      ]);
      setAvailable(has && enrolled);
      const v = await AsyncStorage.getItem(ENABLED_KEY);
      const on = v === '1';
      setEnabledState(on);
      if (on && has && enrolled) setLocked(true);
    })();
  }, []);

  // App state listener — lock on resume if backgrounded long enough
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        bgTsRef.current = Date.now();
      } else if (state === 'active') {
        const ts = bgTsRef.current;
        if (ts && enabled && available && Date.now() - ts > LOCK_AFTER_MS) {
          setLocked(true);
        }
        bgTsRef.current = null;
      }
    });
    return () => sub.remove();
  }, [enabled, available]);

  const authenticate = useCallback(async () => {
    const res = await LA.authenticateAsync({
      promptMessage: 'Unlock Trezofin AI',
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
    });
    if (res.success) setLocked(false);
    return res.success;
  }, []);

  const setEnabled = useCallback(async (on: boolean) => {
    if (on) {
      if (!available) return false;
      // Confirm with a biometric prompt before turning on
      const r = await LA.authenticateAsync({ promptMessage: 'Enable biometric lock' });
      if (!r.success) return false;
    }
    setEnabledState(on);
    await AsyncStorage.setItem(ENABLED_KEY, on ? '1' : '0');
    return true;
  }, [available]);

  return { enabled, locked, available, authenticate, setEnabled };
}
