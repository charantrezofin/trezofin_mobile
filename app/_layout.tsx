import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import '../global.css';
import { supabase } from '../lib/supabase/client';
import { ThemeProvider, useTheme } from '../lib/theme/ThemeProvider';

function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Load initial session + subscribe to auth state
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

  // Redirect when auth state changes, using Expo Router segments
  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === 'auth';
    if (!signedIn && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (signedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [ready, signedIn, segments, router]);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#00d09c" />
      </View>
    );
  }
  return <>{children}</>;
}

function Shell() {
  const t = useTheme();
  return (
    <>
      <StatusBar style={t.statusBar === 'light' ? 'light' : 'dark'} />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/login" />
        </Stack>
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
