import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowRight, Mail } from 'lucide-react-native';
import { supabase } from '../../lib/supabase/client';
import { useTheme } from '../../lib/theme/ThemeProvider';
import AuthLayout from '../../components/auth/AuthLayout';

const OTP_LEN = 6;

export default function VerifyOtp() {
  const t = useTheme();
  const { email, signup } = useLocalSearchParams<{ email?: string; signup?: string }>();
  const isSignup = signup === '1';
  const [digits, setDigits] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(60);
  const inputs = useRef<Array<TextInput | null>>([]);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, '').slice(-1); // keep only last typed digit
    setDigits((prev) => {
      const next = [...prev];
      next[i] = clean;
      return next;
    });
    if (clean && i < OTP_LEN - 1) inputs.current[i + 1]?.focus();
  };

  const handleKeyPress = (i: number, key: string) => {
    if (key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
      setDigits((prev) => {
        const next = [...prev];
        next[i - 1] = '';
        return next;
      });
    }
  };

  const verify = async () => {
    const token = digits.join('');
    if (token.length !== OTP_LEN || !email) return;
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: isSignup ? 'signup' : 'email',
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      setDigits(Array(OTP_LEN).fill(''));
      inputs.current[0]?.focus();
      return;
    }
    // AuthGate will pick up the new session and route to /(tabs)
    router.replace('/(tabs)');
  };

  const resend = async () => {
    if (!email || resendIn > 0) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) Alert.alert('Could not resend', error.message);
    else {
      Alert.alert('Code resent', 'Check your inbox for a new code.');
      setResendIn(60);
    }
  };

  return (
    <AuthLayout
      title="Enter the code"
      subtitle={email ? `We sent a 6-digit code to ${email}.` : 'We sent a 6-digit code.'}
      showBack
    >
      <View className="flex-row justify-between mb-6" style={{ gap: 8 }}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => { inputs.current[i] = r; }}
            value={d}
            onChangeText={(v) => setDigit(i, v)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            textContentType="oneTimeCode"
            style={{
              flex: 1, height: 58,
              backgroundColor: t.card,
              borderColor: d ? t.brand : t.border,
              borderWidth: 1, borderRadius: 14,
              textAlign: 'center',
              fontSize: 22, fontWeight: '700',
              color: t.textPrimary,
            }}
          />
        ))}
      </View>

      {err ? (
        <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>{err}</Text>
      ) : null}

      <Pressable
        onPress={verify}
        disabled={loading || digits.some((d) => !d)}
        className="flex-row items-center justify-center gap-2 py-4 rounded-2xl"
        style={{ backgroundColor: loading || digits.some((d) => !d) ? t.border : t.brand }}
      >
        {loading ? <ActivityIndicator color="#ffffff" /> : (
          <>
            <Text className="text-white font-semibold text-base">Verify</Text>
            <ArrowRight size={16} color="#ffffff" />
          </>
        )}
      </Pressable>

      <Pressable onPress={resend} disabled={resendIn > 0} style={{ marginTop: 18, alignSelf: 'center' }}>
        <Text style={{ color: resendIn > 0 ? t.textSecondary : t.brand, fontSize: 13, fontWeight: '600' }}>
          {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
        </Text>
      </Pressable>

      <View className="flex-row items-center justify-center gap-1.5 mt-8">
        <Mail size={12} color={t.textSecondary} />
        <Text style={{ color: t.textSecondary, fontSize: 12 }}>
          Code valid for 10 minutes.
        </Text>
      </View>
    </AuthLayout>
  );
}
