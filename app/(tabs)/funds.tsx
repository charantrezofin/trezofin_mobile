import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, GitCompare, Check } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { listFunds, type Fund } from '../../lib/api/funds';
import { useWatchlist } from '../../lib/hooks/useWatchlist';
import FundRow from '../../components/ui/FundRow';
import Card from '../../components/ui/Card';

const CATEGORIES = ['All', 'Equity', 'Debt', 'Hybrid', 'ELSS', 'Index', 'Liquid'];

export default function Funds() {
  const t = useTheme();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [compareMode, setCompareMode] = useState(false);
  const [compareIsins, setCompareIsins] = useState<string[]>([]);

  const { toggle: toggleWatch, isWatched } = useWatchlist();

  const load = useCallback(async () => {
    try {
      const d = await listFunds();
      setFunds(d);
    } catch (e) {
      console.warn('funds load failed:', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let r = funds;
    if (cat !== 'All') {
      r = r.filter((f) => (f.category ?? '').toLowerCase().includes(cat.toLowerCase()));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((f) => f.fund_name?.toLowerCase().includes(q));
    }
    return r;
  }, [funds, cat, search]);

  const toggleCompare = (isin: string | null) => {
    if (!isin) return;
    setCompareIsins((prev) => {
      if (prev.includes(isin)) return prev.filter((i) => i !== isin);
      if (prev.length >= 3) return prev; // cap at 3
      return [...prev, isin];
    });
  };

  const startCompare = () => {
    if (compareIsins.length < 2) return;
    router.push({
      pathname: '/compare',
      params: { isins: compareIsins.join(',') },
    });
    setCompareMode(false);
    setCompareIsins([]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-3xl font-bold" style={{ color: t.textPrimary }}>
            Mutual Funds
          </Text>
          <Pressable
            onPress={() => {
              setCompareMode((m) => !m);
              setCompareIsins([]);
            }}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: compareMode ? t.brand : t.card,
              borderColor: compareMode ? t.brand : t.border,
              borderWidth: 1,
            }}
          >
            <GitCompare size={13} color={compareMode ? '#ffffff' : t.textPrimary} />
            <Text
              className="text-[12px] font-semibold"
              style={{ color: compareMode ? '#ffffff' : t.textPrimary }}
            >
              Compare
            </Text>
          </Pressable>
        </View>

        <Text className="text-sm mb-4" style={{ color: t.textSecondary }}>
          {loading
            ? 'Loading funds…'
            : compareMode
              ? `Pick 2–3 funds · ${compareIsins.length} selected`
              : `${filtered.length} of ${funds.length} funds`}
        </Text>

        {/* Search */}
        <View
          style={{
            backgroundColor: t.card,
            borderColor: t.border, borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 12,
            height: 44,
            flexDirection: 'row', alignItems: 'center', gap: 8,
          }}
        >
          <Search size={16} color={t.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by fund name"
            placeholderTextColor={t.textSecondary}
            style={{ flex: 1, color: t.textPrimary, fontSize: 14 }}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={16} color={t.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {/* Chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(c) => c}
          style={{ marginTop: 12, marginBottom: 8 }}
          contentContainerStyle={{ gap: 8, paddingRight: 20 }}
          renderItem={({ item }) => {
            const active = cat === item;
            return (
              <Pressable
                onPress={() => setCat(item)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                  backgroundColor: active ? t.brand : t.card,
                  borderWidth: 1, borderColor: active ? t.brand : t.border,
                }}
              >
                <Text style={{ color: active ? '#ffffff' : t.textPrimary, fontSize: 12, fontWeight: '600' }}>
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {loading ? (
        <FundSkeleton />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(f) => String(f.id)}
          contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: compareMode ? 120 : 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
              tintColor={t.brand}
            />
          }
          ListEmptyComponent={
            <Card style={{ alignItems: 'center' }}>
              <Text style={{ color: t.textSecondary }} className="text-sm">
                No funds match your search.
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <FundRow
              name={item.fund_name}
              category={item.category?.replace(' Fund', '')}
              score={item.trezofin_score}
              return1y={item.return_1y}
              return3y={item.return_3y}
              aumCr={item.aum_cr}
              recommended={(item.trezofin_score ?? 0) >= 7.5}
              amfiCode={item.amfi_code}
              isWatched={isWatched(item.amfi_code)}
              onToggleWatch={() => item.amfi_code ? toggleWatch(item.amfi_code) : undefined}
              onInvest={() => item.isin && router.push(`/funds/${item.isin}`)}
              onPress={() => item.isin && router.push(`/funds/${item.isin}`)}
              compareMode={compareMode}
              compareSelected={!!item.isin && compareIsins.includes(item.isin)}
              onToggleCompare={() => toggleCompare(item.isin)}
            />
          )}
          initialNumToRender={12}
          windowSize={10}
          removeClippedSubviews
        />
      )}

      {/* Compare CTA bar */}
      {compareMode && compareIsins.length >= 2 && (
        <View
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            padding: 16, paddingBottom: 28,
            backgroundColor: t.card,
            borderTopColor: t.border, borderTopWidth: 1,
          }}
        >
          <Pressable
            onPress={startCompare}
            className="flex-row items-center justify-center gap-2 py-3.5 rounded-2xl"
            style={{ backgroundColor: t.brand }}
          >
            <Check size={16} color="#ffffff" />
            <Text className="text-white font-semibold">
              Compare {compareIsins.length} funds
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function FundSkeleton() {
  const t = useTheme();
  return (
    <View style={{ padding: 20, gap: 10 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 120, borderRadius: 16,
            backgroundColor: t.card, borderColor: t.border, borderWidth: 1,
            opacity: 0.6,
          }}
        />
      ))}
    </View>
  );
}
