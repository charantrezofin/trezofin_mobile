import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase/client';
import { useTheme } from '../../lib/theme/ThemeProvider';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthField from '../../components/auth/AuthField';

export default function Login() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    if (!email || !password) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) setError(error.message);
    // on success, AuthGate in _layout.tsx redirects to /(tabs)
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue investing with Tara."
      footer={
        <View className="flex-row items-center justify-center gap-1.5">
          <Text style={{ color: t.textSecondary, fontSize: 13 }}>
            New to Trezofin?
          </Text>
          <Pressable onPress={() => router.push('/auth/signup')} hitSlop={8}>
            <Text style={{ color: t.brand, fontSize: 13, fontWeight: '700' }}>
              Create an account
            </Text>
          </Pressable>
        </View>
      }
    >
      <AuthField
        label="Email"
        leftIcon={<Mail size={16} color={t.textSecondary} />}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        returnKeyType="next"
      />
      <AuthField
        label="Password"
        leftIcon={<Lock size={16} color={t.textSecondary} />}
        placeholder="••••••••"
        autoCapitalize="none"
        autoComplete="password"
        secureTextEntry
        toggleSecure
        value={password}
        onChangeText={setPassword}
        returnKeyType="go"
        onSubmitEditing={signIn}
      />

      <Pressable
        onPress={() => router.push('/auth/forgot-password')}
        hitSlop={6}
        style={{ alignSelf: 'flex-end', marginTop: -2, marginBottom: 20 }}
      >
        <Text style={{ color: t.brand, fontSize: 13, fontWeight: '600' }}>
          Forgot password?
        </Text>
      </Pressable>

      {error ? (
        <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={signIn}
        disabled={loading || !email || !password}
        className="flex-row items-center justify-center gap-2 py-4 rounded-2xl"
        style={{
          backgroundColor: loading || !email || !password ? t.border : t.brand,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Text className="text-white font-semibold text-base">Sign in</Text>
            <ArrowRight size={16} color="#ffffff" />
          </>
        )}
      </Pressable>

      <View className="flex-row items-center gap-3 my-5">
        <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
        <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '600' }}>
          OR
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
      </View>

      <Pressable
        onPress={async () => {
          if (!email) {
            Alert.alert('Email needed', 'Enter your email first — we\'ll send a sign-in code.');
            return;
          }
          setLoading(true);
          const { error } = await supabase.auth.signInWithOtp({
            email: email.trim().toLowerCase(),
          });
          setLoading(false);
          if (error) Alert.alert('OTP failed', error.message);
          else router.push({ pathname: '/auth/verify-otp', params: { email: email.trim().toLowerCase() } });
        }}
        disabled={loading}
        className="py-4 rounded-2xl items-center"
        style={{ backgroundColor: t.card, borderColor: t.border, borderWidth: 1 }}
      >
        <Text style={{ color: t.textPrimary, fontWeight: '600', fontSize: 14 }}>
          Sign in with email OTP
        </Text>
      </Pressable>
    </AuthLayout>
  );
}
