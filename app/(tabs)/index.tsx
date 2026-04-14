import { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase/client';
import { getUserProfile, type UserProfile } from '../../lib/api/client';
import { useTheme } from '../../lib/theme/ThemeProvider';
import VoiceBar from '../../components/voice/VoiceBar';

export default function Dashboard() {
  const t = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const p = await getUserProfile(token);
      setProfile(p);
    } catch (e) {
      // Non-fatal on first scaffold; backend may not be reachable yet.
      console.warn('profile load failed:', (e as Error).message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const firstName = profile?.first_name ?? 'there';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.brand}
          />
        }
      >
        {/* Greeting */}
        <Text
          className="text-3xl font-bold mb-1"
          style={{ color: t.textPrimary }}
        >
          Hi, {firstName} 👋
        </Text>
        <Text className="text-base mb-6" style={{ color: t.textSecondary }}>
          Here&apos;s your investment picture.
        </Text>

        {/* Risk profile card */}
        <View
          className="rounded-2xl p-5 mb-5"
          style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <Text
            className="text-[10px] font-bold uppercase tracking-widest mb-2"
            style={{ color: t.textSecondary }}
          >
            Active Strategy
          </Text>
          <View className="flex-row items-end justify-between">
            <Text
              className="text-xl font-semibold"
              style={{ color: t.textPrimary }}
            >
              {profile?.risk_category ?? '—'}
            </Text>
            <Text style={{ color: t.textSecondary }} className="text-sm">
              Risk {profile?.risk_score ?? '—'}
              <Text style={{ color: t.textSecondary }}>/50</Text>
            </Text>
          </View>
        </View>

        {/* Voice bar */}
        <VoiceBar />

        {/* Placeholder "Mutual Fund Intelligence" list header */}
        <Text
          className="text-lg font-bold mt-8 mb-1"
          style={{ color: t.textPrimary }}
        >
          Mutual Fund Intelligence
        </Text>
        <Text style={{ color: t.textSecondary }} className="text-sm mb-4">
          Recommended picks coming next.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
