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
      const [has, enrolled, types] = await Promise.all([
        LA.hasHardwareAsync(),
        LA.isEnrolledAsync(),
        LA.supportedAuthenticationTypesAsync(),
      ]);
      // Diagnostic — if `types` does NOT include FACIAL_RECOGNITION on a
      // Face ID phone, you're almost certainly running in Expo Go. Expo
      // Go's own bundle doesn't ship with a Face ID entitlement, so iOS
      // blocks the biometric call and falls straight to passcode. The
      // fix is a development build (`eas build --profile development
      // --platform ios`) — then FaceID will actually work.
      console.log('[biometric] hw=', has, 'enrolled=', enrolled,
        'types=', types, '(1=Touch, 2=Face, 3=Iris)');
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
    // Two-step unlock: try biometric alone first (no passcode UI, no leak
    // of the device PIN surface). Only if the biometric attempt fails or
    // the user taps "Use passcode" do we fall through to the device
    // passcode sheet. This matches Apple/Google's native pattern and
    // avoids the "asks password every time" issue we had when fallback
    // was enabled on the very first attempt.
    const bio = await LA.authenticateAsync({
      promptMessage: 'Unlock Trezofin AI',
      cancelLabel: 'Use device passcode',
      disableDeviceFallback: true,
    });
    if (bio.success) {
      setLocked(false);
      return true;
    }

    // Biometric didn't succeed — offer device passcode as a second step.
    // `error` is 'user_cancel' if they explicitly backed out; we still try
    // because the cancel label we showed is literally "Use device passcode".
    const pc = await LA.authenticateAsync({
      promptMessage: 'Unlock with device passcode',
      disableDeviceFallback: false,
    });
    if (pc.success) setLocked(false);
    return pc.success;
  }, []);

  const setEnabled = useCallback(async (on: boolean) => {
    if (on) {
      if (!available) return false;
      // Confirm with biometric before turning on; allow passcode as a
      // fallback so a flaky Face ID scan doesn't block enabling the feature.
      const r = await LA.authenticateAsync({
        promptMessage: 'Enable biometric lock',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (!r.success) return false;
    }
    setEnabledState(on);
    await AsyncStorage.setItem(ENABLED_KEY, on ? '1' : '0');
    return true;
  }, [available]);

  return { enabled, locked, available, authenticate, setEnabled };
}
