import { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTheme } from '../../lib/theme/ThemeProvider';
import type { CalendarYearReturn } from '../../lib/api/fund-analytics';

/**
 * Calendar-year returns as a horizontal bar chart. Green for positive,
 * red for negative. Fit-to-width via onLayout so the card never
 * overflows.
 */
export default function CalendarYearsChart({
  data,
}: {
  data: CalendarYearReturn[];
}) {
  const t = useTheme();
  const [w, setW] = useState(0);

  const bars = useMemo(() => {
    // Latest 7 years, oldest → newest so labels read left-to-right.
    const years = [...data]
      .filter((d) => d.return_pct != null)
      .sort((a, b) => a.year - b.year)
      .slice(-7);

    return years.map((d) => ({
      value: Number((d.return_pct ?? 0).toFixed(1)),
      label: String(d.year),
      frontColor: (d.return_pct ?? 0) >= 0 ? '#10b981' : '#ef4444',
      topLabelComponent: () => (
        <Text style={{
          color: (d.return_pct ?? 0) >= 0 ? '#10b981' : '#ef4444',
          fontSize: 9, fontWeight: '700',
        }}>
          {(d.return_pct ?? 0) >= 0 ? '+' : ''}{(d.return_pct ?? 0).toFixed(1)}
        </Text>
      ),
    }));
  }, [data]);

  if (!bars.length) {
    return (
      <Text className="text-xs" style={{ color: t.textSecondary }}>
        No yearly returns available.
      </Text>
    );
  }

  const n = bars.length;
  const barWidth = 22;
  const gap = Math.max(4, (Math.max(0, w - 24) - n * barWidth) / Math.max(1, n - 1));

  return (
    <View onLayout={(e) => setW(Math.floor(e.nativeEvent.layout.width))}
      style={{ height: 180, overflow: 'hidden' }}>
      {w > 0 ? (
        <BarChart
          data={bars}
          width={w - 4}
          height={160}
          barWidth={barWidth}
          spacing={gap}
          initialSpacing={6}
          roundedTop
          hideRules
          hideAxesAndRules
          xAxisThickness={0}
          yAxisThickness={0}
          hideYAxisText
          xAxisLabelTextStyle={{
            color: t.textSecondary, fontSize: 10, fontWeight: '600',
          }}
          disableScroll
          noOfSections={3}
        />
      ) : null}
    </View>
  );
}
