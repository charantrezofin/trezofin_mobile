import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase/client';
import { useTheme } from '../../lib/theme/ThemeProvider';

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-center px-8">
          <View className="mb-10">
            <Text
              className="text-4xl font-bold mb-2"
              style={{ color: t.textPrimary }}
            >
              Trezofin AI
            </Text>
            <Text style={{ color: t.textSecondary }} className="text-base">
              Your AI investment buddy.
            </Text>
          </View>

          <View className="gap-3">
            <TextInput
              placeholder="Email"
              placeholderTextColor={t.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              className="rounded-2xl px-4 py-4 text-base"
              style={{
                backgroundColor: t.card,
                color: t.textPrimary,
                borderWidth: 1,
                borderColor: t.border,
              }}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={t.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              className="rounded-2xl px-4 py-4 text-base"
              style={{
                backgroundColor: t.card,
                color: t.textPrimary,
                borderWidth: 1,
                borderColor: t.border,
              }}
            />

            {error ? (
              <Text className="text-red-500 text-sm px-1">{error}</Text>
            ) : null}

            <Pressable
              onPress={signIn}
              disabled={loading || !email || !password}
              className="rounded-2xl py-4 items-center mt-2"
              style={{
                backgroundColor: loading || !email || !password ? t.border : t.brand,
                opacity: loading || !email || !password ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-base">Sign in</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
