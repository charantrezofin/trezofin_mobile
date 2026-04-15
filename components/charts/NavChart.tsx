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

/**
 * NAV area-line chart. The chart scales its spacing to fit the measured
 * container width (via onLayout) so it never overflows the card. Data
 * is downsampled to MAX_POINTS so we have predictable spacing.
 */
const MAX_POINTS = 60;

export default function NavChart({ isin }: { isin: string }) {
  const t = useTheme();
  const [data, setData] = useState<NavHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('1Y');
  const [chartW, setChartW] = useState(0);

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

    const all = data.nav_history
      .map((p) => ({ t: parseDDMMYYYY(p.date), v: Number(p.nav) }))
      .filter((p) => Number.isFinite(p.v) && Number.isFinite(p.t) && p.t >= cutoff)
      .sort((a, b) => a.t - b.t);

    if (all.length <= MAX_POINTS) return all;
    const step = Math.ceil(all.length / MAX_POINTS);
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

  // Fit all points inside the measured width. Reserve a tiny right gutter
  // so the last point isn't clipped by the curve.
  const n = chartData.length;
  const chartHeight = 170;
  const safeW = Math.max(0, chartW - 4);
  const spacing = n > 1 ? safeW / (n - 1) : 0;

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

      {/* Header */}
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

      {/* Chart — measured container, overflow hidden so any rounding
          slop from gifted-charts can't leak outside the card. */}
      <View
        onLayout={(e) => setChartW(Math.floor(e.nativeEvent.layout.width))}
        style={{ height: chartHeight, overflow: 'hidden' }}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={t.brand} />
          </View>
        ) : chartData.length < 2 || chartW === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text className="text-xs" style={{ color: t.textSecondary }}>
              Not enough NAV history for this range.
            </Text>
          </View>
        ) : (
          <LineChart
            data={chartData}
            width={safeW}
            height={chartHeight}
            adjustToWidth
            disableScroll
            initialSpacing={0}
            endSpacing={0}
            spacing={spacing}
            thickness={2}
            color={color}
            hideDataPoints
            startFillColor={color}
            endFillColor={color}
            startOpacity={0.25}
            endOpacity={0.02}
            areaChart
            curved
            xAxisColor="transparent"
            yAxisColor="transparent"
            rulesColor={t.border}
            rulesType="dashed"
            hideYAxisText
            noOfSections={3}
          />
        )}
      </View>
    </View>
  );
}
