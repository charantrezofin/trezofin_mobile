import { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { getNavHistory, type NavHistory } from '../../lib/api/nav';

type Range = '1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL';
const RANGES: Range[] = ['1M', '3M', '6M', '1Y', '3Y', 'ALL'];

function parseDDMMYYYY(s: string): number {
  const [d, m, y] = s.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export default function NavChart({ isin, width }: { isin: string; width: number }) {
  const t = useTheme();
  const [data, setData] = useState<NavHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('1Y');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const d = await getNavHistory(isin);
      if (!cancelled) {
        setData(d);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isin]);

  const points = useMemo(() => {
    if (!data?.nav_history?.length) return [];
    const now = Date.now();
    const windowDays = range === '1M' ? 30 : range === '3M' ? 90 : range === '6M' ? 180
      : range === '1Y' ? 365 : range === '3Y' ? 365 * 3 : Infinity;
    const cutoff = now - windowDays * 24 * 3600 * 1000;

    // nav_history is newest-first typically (mfapi.in). Normalise + filter.
    const all = data.nav_history
      .map((p) => ({ t: parseDDMMYYYY(p.date), v: Number(p.nav) }))
      .filter((p) => Number.isFinite(p.v) && Number.isFinite(p.t) && p.t >= cutoff)
      .sort((a, b) => a.t - b.t);

    // Downsample to <= 120 points for smooth rendering.
    if (all.length <= 120) return all;
    const step = Math.ceil(all.length / 120);
    return all.filter((_, i) => i % step === 0);
  }, [data, range]);

  const chartData = useMemo(
    () => points.map((p) => ({ value: p.v })),
    [points],
  );

  const firstV = points[0]?.v;
  const lastV  = points[points.length - 1]?.v;
  const pct    = firstV && lastV ? ((lastV - firstV) / firstV) * 100 : null;
  const color  = pct == null ? t.brand : pct >= 0 ? '#10b981' : '#ef4444';

  return (
    <View>
      {/* Range chips */}
      <View className="flex-row gap-1.5 mb-3">
        {RANGES.map((r) => {
          const active = range === r;
          return (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                backgroundColor: active ? t.brand : t.card,
                borderColor: active ? t.brand : t.border, borderWidth: 1,
              }}
            >
              <Text style={{ color: active ? '#ffffff' : t.textSecondary, fontSize: 11, fontWeight: '700' }}>
                {r}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Header line: current NAV + range delta */}
      <View className="flex-row items-end justify-between mb-2">
        <Text className="text-2xl font-extrabold" style={{ color: t.textPrimary }}>
          ₹{data?.current_nav?.toFixed(2) ?? '—'}
        </Text>
        {pct != null && (
          <Text className="text-sm font-bold" style={{ color }}>
            {pct >= 0 ? '+' : ''}{pct.toFixed(2)}% · {range}
          </Text>
        )}
      </View>

      {/* Chart */}
      <View style={{ minHeight: 180 }}>
        {loading ? (
          <View style={{ height: 180, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={t.brand} />
          </View>
        ) : chartData.length < 2 ? (
          <Text className="text-xs" style={{ color: t.textSecondary }}>
            Not enough NAV history for this range.
          </Text>
        ) : (
          <LineChart
            data={chartData}
            width={Math.max(width - 40, 240)}
            height={170}
            initialSpacing={0}
            spacing={Math.max(1, (width - 40) / Math.max(chartData.length - 1, 1))}
            thickness={2}
            color={color}
            hideDataPoints
            startFillColor={color}
            endFillColor={color}
            startOpacity={0.25}
            endOpacity={0.02}
            areaChart
            isAnimated
            curved
            xAxisColor="transparent"
            yAxisColor="transparent"
            rulesColor={t.border}
            rulesType="dashed"
            hideYAxisText
            hideRules={false}
            noOfSections={3}
          />
        )}
      </View>
    </View>
  );
}
