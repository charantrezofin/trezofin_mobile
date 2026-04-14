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
import { Search, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { listFunds, type Fund } from '../../lib/api/funds';
import FundRow from '../../components/ui/FundRow';
import Card from '../../components/ui/Card';

const CATEGORIES = [
  'All',
  'Equity',
  'Debt',
  'Hybrid',
  'ELSS',
  'Index',
  'Liquid',
];

export default function Funds() {
  const t = useTheme();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Text className="text-3xl font-bold mb-1" style={{ color: t.textPrimary }}>
          Mutual Funds
        </Text>
        <Text className="text-sm mb-4" style={{ color: t.textSecondary }}>
          {loading ? 'Loading funds…' : `${filtered.length} of ${funds.length} funds`}
        </Text>

        {/* Search */}
        <View
          style={{
            backgroundColor: t.card,
            borderColor: t.border,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 12,
            height: 44,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
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

        {/* Category chips */}
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
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? t.brand : t.card,
                  borderWidth: 1,
                  borderColor: active ? t.brand : t.border,
                }}
              >
                <Text
                  style={{
                    color: active ? '#ffffff' : t.textPrimary,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.brand} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(f) => String(f.id)}
          contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={async () => {
              setRefreshing(true); await load(); setRefreshing(false);
            }} tintColor={t.brand} />
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
              onPress={() => item.isin && router.push(`/funds/${item.isin}`)}
            />
          )}
          initialNumToRender={12}
          windowSize={10}
          removeClippedSubviews
        />
      )}
    </SafeAreaView>
  );
}
