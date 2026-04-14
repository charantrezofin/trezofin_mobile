import { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Shield, ChevronRight, Award, Star, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import { getUserProfile, type UserProfile } from '../../lib/api/client';
import { getVoiceContext } from '../../lib/api/ai';
import { useSession } from '../../lib/hooks/useSession';
import { useTheme } from '../../lib/theme/ThemeProvider';
import VoiceBar from '../../components/voice/VoiceBar';
import Card from '../../components/ui/Card';
import ScoreBadge from '../../components/ui/ScoreBadge';

type RecoFund = { name: string; category: string | null; score: number | null };

export default function Dashboard() {
  const t = useTheme();
  const { accessToken, ready } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recos, setRecos]   = useState<RecoFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [p, ctx] = await Promise.all([
        getUserProfile(accessToken).catch(() => null),
        getVoiceContext(accessToken).catch(() => null),
      ]);
      if (p) setProfile(p);
      if (ctx?.recommended_funds) setRecos(ctx.recommended_funds);
    } catch (e) {
      console.warn('dashboard load failed:', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const firstName = profile?.first_name || 'there';
  const risk = profile?.risk_category;
  const riskScore = profile?.risk_score;

  // Risk-category → gradient tuple for the strategy hero card.
  const gradient = useMemo<readonly [string, string]>(() => {
    switch (risk) {
      case 'Conservative':              return ['#0ea5e9', '#0369a1'] as const;
      case 'Moderately Conservative':   return ['#06b6d4', '#0e7490'] as const;
      case 'Moderate / Balanced':       return ['#10b981', '#047857'] as const;
      case 'Moderately Aggressive':     return ['#f59e0b', '#b45309'] as const;
      case 'Aggressive':                return ['#ef4444', '#991b1b'] as const;
      default:                          return ['#64748b', '#334155'] as const;
    }
  }, [risk]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.brand} />}
      >
        {/* Greeting */}
        <View className="mb-5">
          <Text className="text-[13px]" style={{ color: t.textSecondary }}>
            {greeting()}, welcome back
          </Text>
          <Text className="text-3xl font-bold mt-0.5" style={{ color: t.textPrimary }}>
            Hi, {firstName} 👋
          </Text>
        </View>

        {/* Strategy hero — gradient card */}
        <View style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 16 }}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 20 }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <Shield size={14} color="rgba(255,255,255,0.9)" />
              <Text className="text-[10px] font-bold uppercase tracking-widest text-white/85">
                Active Strategy
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : risk ? (
              <>
                <Text className="text-white text-3xl font-extrabold">{risk}</Text>
                <View className="flex-row items-center justify-between mt-4">
                  <View>
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-white/75">Risk Score</Text>
                    <Text className="text-white text-2xl font-bold mt-1">
                      {riskScore ?? '—'}<Text className="text-white/70 text-base"> / 50</Text>
                    </Text>
                  </View>
                  <Pressable
                    onPress={load}
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                  >
                    <RefreshCw size={16} color="#ffffff" />
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text className="text-white text-xl font-bold">Not assessed yet</Text>
                <Text className="text-white/80 text-sm mt-1">
                  Complete your risk assessment on the web app to get personalised recommendations.
                </Text>
              </>
            )}
          </LinearGradient>
        </View>

        {/* Voice bar */}
        <VoiceBar />

        {/* Recommended for you */}
        <View className="mt-8 mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Award size={16} color={t.textPrimary} />
            <Text className="text-lg font-bold" style={{ color: t.textPrimary }}>
              Recommended for you
            </Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/funds')}>
            <Text className="text-sm font-semibold" style={{ color: t.brand }}>See all</Text>
          </Pressable>
        </View>

        {loading ? (
          <Card style={{ alignItems: 'center' }}>
            <ActivityIndicator color={t.brand} />
          </Card>
        ) : recos.length === 0 ? (
          <Card>
            <Text className="text-sm" style={{ color: t.textSecondary }}>
              No recommendations yet. Complete your risk profile to see picks.
            </Text>
          </Card>
        ) : (
          <View className="gap-2.5">
            {recos.slice(0, 5).map((f, i) => (
              <Card key={i} padding={14}>
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center"
                    style={{ backgroundColor: t.brand + '1A' }}
                  >
                    <Star size={16} color={t.brand} fill={t.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-[15px] font-semibold" style={{ color: t.textPrimary }} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <Text className="text-[11px] mt-0.5" style={{ color: t.textSecondary }} numberOfLines={1}>
                      {f.category ?? 'Mutual Fund'}
                    </Text>
                  </View>
                  <ScoreBadge score={f.score} />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Insight strip */}
        <Card padding={16} style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: '#10b98122' }}
          >
            <TrendingUp size={18} color="#10b981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text className="text-[13px] font-semibold" style={{ color: t.textPrimary }}>
              Ask Tara anything
            </Text>
            <Text className="text-[11px] mt-0.5" style={{ color: t.textSecondary }}>
              Try: "Which of my picks should I start with?"
            </Text>
          </View>
          <ChevronRight size={16} color={t.textSecondary} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
