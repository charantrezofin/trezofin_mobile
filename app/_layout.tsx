import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Fingerprint, WifiOff } from 'lucide-react-native';
import '../global.css';
import { supabase } from '../lib/supabase/client';
import { ThemeProvider, useTheme } from '../lib/theme/ThemeProvider';
import { useSession } from '../lib/hooks/useSession';
import { useIsOnline } from '../lib/hooks/useNetInfo';
import { useBiometricLock } from '../lib/hooks/useBiometricLock';
import { registerForPushAsync } from '../lib/push';

function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSignedIn(!!data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSignedIn(!!session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === 'auth';
    if (!signedIn && !inAuthGroup) router.replace('/auth/login');
    else if (signedIn && inAuthGroup) router.replace('/(tabs)');
  }, [ready, signedIn, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0e1a' }}>
        <ActivityIndicator color="#00d09c" />
      </View>
    );
  }
  return <>{children}</>;
}

function OfflineBanner() {
  const online = useIsOnline();
  const t = useTheme();
  if (online) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#b91c1c',
      }}
    >
      <WifiOff size={14} color="#ffffff" />
      <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '600', flex: 1 }}>
        No internet. Showing cached content.
      </Text>
    </View>
  );
}

function BiometricGate({ children }: { children: React.ReactNode }) {
  const { enabled, locked, authenticate } = useBiometricLock();
  const t = useTheme();

  if (!enabled || !locked) return <>{children}</>;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View
        style={{
          width: 72, height: 72, borderRadius: 36,
          backgroundColor: t.brand + '22',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <Fingerprint size={32} color={t.brand} />
      </View>
      <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 6 }}>
        Trezofin AI is locked
      </Text>
      <Text style={{ color: t.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
        Use Face ID, fingerprint, or your device passcode to continue.
      </Text>
      <Pressable
        onPress={authenticate}
        style={{
          paddingHorizontal: 24, paddingVertical: 14,
          borderRadius: 14, backgroundColor: t.brand,
        }}
      >
        <Text style={{ color: '#ffffff', fontWeight: '600' }}>Unlock</Text>
      </Pressable>
    </View>
  );
}

function PushRegistrar() {
  const { accessToken } = useSession();
  useEffect(() => {
    if (accessToken) {
      registerForPushAsync(accessToken).catch(() => {});
    }
  }, [accessToken]);
  return null;
}

function Shell() {
  const t = useTheme();
  return (
    <>
      <StatusBar style={t.statusBar === 'light' ? 'light' : 'dark'} />
      <AuthGate>
        <BiometricGate>
          <View style={{ flex: 1, backgroundColor: t.bg }}>
            <OfflineBanner />
            <PushRegistrar />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="auth/login" />
              <Stack.Screen name="funds/[isin]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="orders" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="sips" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="compare" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen
                name="risk-assessment"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
            </Stack>
          </View>
        </BiometricGate>
      </AuthGate>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Shell />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
