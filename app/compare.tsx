import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ScreenHeader from '../components/ui/ScreenHeader';
import Card from '../components/ui/Card';
import ScoreBadge from '../components/ui/ScoreBadge';
import { useTheme } from '../lib/theme/ThemeProvider';
import { supabase } from '../lib/supabase/client';
import type { Fund } from '../lib/api/funds';

export default function CompareScreen() {
  const t = useTheme();
  const { isins } = useLocalSearchParams<{ isins: string }>();
  const list = useMemo(() => (isins ?? '').split(',').filter(Boolean), [isins]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!list.length) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('funds')
          .select('*')
          .in('isin', list);
        if (!cancelled) setFunds((data ?? []) as Fund[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [list]);

  const rows: Array<{ label: string; pick: (f: Fund) => string; highlight?: 'max' | 'min' | null }> = [
    { label: 'Trezofin score', pick: (f) => (f.trezofin_score ?? 0).toFixed(1), highlight: 'max' },
    { label: '1Y return',      pick: (f) => fmtPct(f.return_1y), highlight: 'max' },
    { label: '3Y return',      pick: (f) => fmtPct(f.return_3y), highlight: 'max' },
    { label: '5Y return',      pick: (f) => fmtPct(f.return_5y), highlight: 'max' },
    { label: 'Sharpe',         pick: (f) => (f.sharpe != null ? f.sharpe.toFixed(2) : '—'), highlight: 'max' },
    { label: 'AUM',            pick: (f) => (f.aum_cr != null ? (f.aum_cr >= 1000 ? `${(f.aum_cr / 1000).toFixed(1)}K Cr` : `${f.aum_cr.toFixed(0)} Cr`) : '—') },
    { label: 'Category',       pick: (f) => f.category ?? '—' },
    { label: 'Risk profile',   pick: (f) => f.risk_category ?? '—' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title="Compare funds" subtitle={`${funds.length} funds`} />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.brand} />
        </View>
      ) : funds.length < 2 ? (
        <View style={{ padding: 20 }}>
          <Card>
            <Text style={{ color: t.textSecondary }} className="text-sm">
              Pick at least two funds to compare.
            </Text>
          </Card>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ padding: 16 }}>
            {/* Header row */}
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 130 }} />
              {funds.map((f) => (
                <View key={f.id} style={{ width: 180, paddingHorizontal: 6 }}>
                  <Card padding={12} style={{ marginBottom: 0 }}>
                    <View className="flex-row items-start justify-between gap-2">
                      <Text className="text-[12.5px] font-semibold flex-1" style={{ color: t.textPrimary }} numberOfLines={3}>
                        {f.fund_name}
                      </Text>
                      <ScoreBadge score={f.trezofin_score} />
                    </View>
                    <Text className="text-[10px] mt-1" style={{ color: t.textSecondary }} numberOfLines={1}>
                      {f.category?.replace(' Fund', '')}
                    </Text>
                  </Card>
                </View>
              ))}
            </View>

            {/* Data rows */}
            <View style={{ marginTop: 8, borderRadius: 14, overflow: 'hidden', borderColor: t.border, borderWidth: 1 }}>
              {rows.map((row, idx) => {
                const values = funds.map(row.pick);
                // Find winner for highlighted numeric rows
                let winnerIdx = -1;
                if (row.highlight) {
                  const numeric = funds.map((f) => {
                    const raw = row.label === '1Y return' ? f.return_1y
                      : row.label === '3Y return' ? f.return_3y
                      : row.label === '5Y return' ? f.return_5y
                      : row.label === 'Sharpe' ? f.sharpe
                      : row.label === 'Trezofin score' ? f.trezofin_score
                      : null;
                    return raw == null ? -Infinity : Number(raw);
                  });
                  winnerIdx = numeric.indexOf(Math.max(...numeric));
                }
                return (
                  <View
                    key={row.label}
                    style={{
                      flexDirection: 'row',
                      backgroundColor: idx % 2 === 0 ? t.card : t.bg,
                    }}
                  >
                    <View style={{ width: 130, padding: 12, justifyContent: 'center' }}>
                      <Text className="text-[11px] font-bold uppercase tracking-wide" style={{ color: t.textSecondary }}>
                        {row.label}
                      </Text>
                    </View>
                    {funds.map((f, i) => (
                      <View key={f.id} style={{ width: 180, padding: 12, paddingHorizontal: 18 }}>
                        <Text
                          style={{
                            color: i === winnerIdx ? t.brand : t.textPrimary,
                            fontWeight: i === winnerIdx ? '700' : '500',
                            fontSize: 13,
                          }}
                          numberOfLines={1}
                        >
                          {values[i]}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}
