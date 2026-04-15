import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase/client';
import { useTheme } from '../../lib/theme/ThemeProvider';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthField from '../../components/auth/AuthField';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const send = async () => {
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      setErr('Enter a valid email');
      return;
    }
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: 'trezofin://auth/login',
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setDone(true);
  };

  return (
    <AuthLayout
      title={done ? 'Check your inbox' : 'Reset your password'}
      subtitle={
        done
          ? `We sent a reset link to ${email.trim().toLowerCase()}. Open it on this device to set a new password.`
          : 'Enter your email and we\'ll send a reset link.'
      }
      showBack
    >
      {done ? (
        <View className="items-center py-6">
          <View
            style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: t.brand + '22',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <CheckCircle2 size={32} color={t.brand} />
          </View>
          <Text className="text-center text-[14px]" style={{ color: t.textSecondary }}>
            Didn't get it? Check spam, or go back and try a different email.
          </Text>
          <Pressable
            onPress={() => router.replace('/auth/login')}
            className="mt-8 py-4 px-8 rounded-2xl"
            style={{ backgroundColor: t.brand }}
          >
            <Text className="text-white font-semibold">Back to sign in</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <AuthField
            label="Email"
            leftIcon={<Mail size={16} color={t.textSecondary} />}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            error={err}
          />
          <Pressable
            onPress={send}
            disabled={loading}
            className="flex-row items-center justify-center gap-2 py-4 rounded-2xl mt-2"
            style={{ backgroundColor: loading ? t.border : t.brand }}
          >
            {loading ? <ActivityIndicator color="#ffffff" /> : (
              <>
                <Text className="text-white font-semibold text-base">Send reset link</Text>
                <ArrowRight size={16} color="#ffffff" />
              </>
            )}
          </Pressable>
        </>
      )}
    </AuthLayout>
  );
}
