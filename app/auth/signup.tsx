import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Mail, Lock, User, Phone, ArrowRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase/client';
import { useTheme } from '../../lib/theme/ThemeProvider';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthField from '../../components/auth/AuthField';

const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^\d{10}$/;

export default function Signup() {
  const t = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [mobile,    setMobile]    = useState(''); // 10 digits, no +91
  const [password,  setPassword]  = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const validate = () => {
    const e: Record<string, string | null> = {};
    if (!firstName.trim()) e.firstName = 'First name required';
    if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email';
    if (mobile && !MOBILE_RE.test(mobile)) e.mobile = 'Enter a 10-digit mobile number';
    if (password.length < 8) e.password = 'Minimum 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createAccount = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      // Pre-flight duplicate check against the public users table (same
      // pattern as the web signup page — avoids Supabase returning a
      // "fake" user with identities=[] for already-registered emails).
      const orFilter = mobile
        ? `email.eq.${cleanEmail},mobile.eq.91${mobile}`
        : `email.eq.${cleanEmail}`;
      const { data: existing } = await supabase
        .from('users')
        .select('id, email, mobile')
        .or(orFilter);
      if (existing && existing.length > 0) {
        const emailTaken = existing.some((u) => u.email === cleanEmail);
        setErrors({
          [emailTaken ? 'email' : 'mobile']:
            `${emailTaken ? 'Email' : 'Mobile number'} already registered. Sign in instead.`,
        });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name:  lastName.trim(),
            ...(mobile ? { mobile: `91${mobile}` } : {}),
          },
        },
      });
      if (error) {
        setErrors({ form: error.message });
        return;
      }
      if (data?.user?.identities?.length === 0) {
        setErrors({ email: 'This email is already registered. Sign in instead.' });
        return;
      }
      // Supabase has sent the confirmation email. Route to OTP screen.
      router.replace({
        pathname: '/auth/verify-otp',
        params: { email: cleanEmail, signup: '1' },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes less than a minute. We'll send a code to your email."
      showBack
      footer={
        <View className="flex-row items-center justify-center gap-1.5">
          <Text style={{ color: t.textSecondary, fontSize: 13 }}>Already have an account?</Text>
          <Pressable onPress={() => router.replace('/auth/login')} hitSlop={8}>
            <Text style={{ color: t.brand, fontSize: 13, fontWeight: '700' }}>Sign in</Text>
          </Pressable>
        </View>
      }
    >
      <View className="flex-row gap-3">
        <View style={{ flex: 1 }}>
          <AuthField
            label="First name"
            leftIcon={<User size={16} color={t.textSecondary} />}
            placeholder="Charan"
            autoCapitalize="words"
            value={firstName}
            onChangeText={setFirstName}
            error={errors.firstName}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AuthField
            label="Last name"
            placeholder="Dasari"
            autoCapitalize="words"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
      </View>

      <AuthField
        label="Email"
        leftIcon={<Mail size={16} color={t.textSecondary} />}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
      />

      <AuthField
        label="Mobile (optional)"
        leftIcon={<Phone size={16} color={t.textSecondary} />}
        placeholder="10-digit number"
        keyboardType="number-pad"
        maxLength={10}
        value={mobile}
        onChangeText={(v) => setMobile(v.replace(/\D/g, ''))}
        error={errors.mobile}
      />

      <AuthField
        label="Password"
        leftIcon={<Lock size={16} color={t.textSecondary} />}
        placeholder="Minimum 8 characters"
        autoCapitalize="none"
        secureTextEntry
        toggleSecure
        value={password}
        onChangeText={setPassword}
        error={errors.password}
      />

      {errors.form ? (
        <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>
          {errors.form}
        </Text>
      ) : null}

      <Pressable
        onPress={createAccount}
        disabled={loading}
        className="flex-row items-center justify-center gap-2 py-4 rounded-2xl mt-2"
        style={{ backgroundColor: loading ? t.border : t.brand }}
      >
        {loading ? <ActivityIndicator color="#ffffff" /> : (
          <>
            <Text className="text-white font-semibold text-base">Create account</Text>
            <ArrowRight size={16} color="#ffffff" />
          </>
        )}
      </Pressable>

      <Text className="text-[11px] text-center mt-4" style={{ color: t.textSecondary }}>
        By creating an account you agree to our Terms and Privacy Policy.
      </Text>
    </AuthLayout>
  );
}
