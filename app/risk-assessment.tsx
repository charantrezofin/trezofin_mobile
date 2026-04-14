import { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Shield, ExternalLink, X } from 'lucide-react-native';
import { useTheme } from '../lib/theme/ThemeProvider';
import { useSession } from '../lib/hooks/useSession';
import { supabase } from '../lib/supabase/client';
import Card from '../components/ui/Card';

// The 10-question risk assessment currently lives on the web app. To
// retake it from the mobile app we open the web flow in an in-app
// browser session. Once finished, the assessment result is written to
// Supabase; when we come back to the app the dashboard re-fetches the
// profile and shows the new category/score.
const WEB_URL = 'https://trezofin.ai/risk-assessment?mode=retake';

export default function RiskAssessment() {
  const t = useTheme();
  const { accessToken } = useSession();

  const open = async () => {
    // Add the Supabase access token as a hash fragment so the web app
    // can pick up the logged-in session if the hosted site supports it.
    const url = accessToken
      ? `${WEB_URL}#access_token=${encodeURIComponent(accessToken)}`
      : WEB_URL;
    const result = await WebBrowser.openAuthSessionAsync(url, 'trezofin://close');
    // After the browser closes, force a session refresh so the
    // dashboard's next fetch pulls the updated risk profile.
    if (result.type === 'dismiss' || result.type === 'success') {
      try { await supabase.auth.refreshSession(); } catch {}
      router.back();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <Text className="text-lg font-bold" style={{ color: t.textPrimary }}>
          Retake risk assessment
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: t.card, borderColor: t.border, borderWidth: 1 }}
        >
          <X size={16} color={t.textPrimary} />
        </Pressable>
      </View>

      <View className="px-5 mt-4">
        <Card padding={20}>
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center mb-4"
            style={{ backgroundColor: t.brand + '22' }}
          >
            <Shield size={22} color={t.brand} />
          </View>
          <Text className="text-xl font-bold mb-1" style={{ color: t.textPrimary }}>
            Your risk appetite shapes your recommendations
          </Text>
          <Text className="text-[13px] leading-5" style={{ color: t.textSecondary }}>
            It's a quick 10-question quiz. Once you finish, your recommended
            funds and strategy on the Home tab will update automatically.
          </Text>

          <Pressable
            onPress={open}
            className="mt-6 flex-row items-center justify-center gap-2 py-4 rounded-2xl"
            style={{ backgroundColor: t.brand }}
          >
            <ExternalLink size={16} color="#ffffff" />
            <Text className="text-white font-semibold">Start assessment</Text>
          </Pressable>

          <Text className="text-[11px] text-center mt-3" style={{ color: t.textSecondary }}>
            Opens the assessment in an in-app browser. Takes ~2 minutes.
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}
