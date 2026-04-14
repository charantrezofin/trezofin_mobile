import { View, Text, Pressable, Alert } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useTheme } from '../../lib/theme/ThemeProvider';
import ScoreBadge from './ScoreBadge';

type Props = {
  name: string;
  category?: string | null;
  score?: number | null;
  return1y?: number | null;
  return3y?: number | null;
  aumCr?: number | null;
  recommended?: boolean;
  amfiCode?: string | null;
  isWatched?: boolean;
  onToggleWatch?: () => Promise<void> | void;
  onInvest?: () => void;
  onPress?: () => void;
  compareMode?: boolean;
  compareSelected?: boolean;
  onToggleCompare?: () => void;
};

export default function FundRow({
  name, category, score, return1y, return3y, aumCr, recommended,
  amfiCode, isWatched, onToggleWatch, onInvest, onPress,
  compareMode, compareSelected, onToggleCompare,
}: Props) {
  const t = useTheme();

  const handleWatch = async () => {
    try { await onToggleWatch?.(); }
    catch (e) { Alert.alert('Oops', (e as Error).message); }
  };

  return (
    <Pressable
      onPress={compareMode ? onToggleCompare : onPress}
      android_ripple={{ color: t.border }}
      style={({ pressed }) => ({
        backgroundColor: t.card,
        borderRadius: 16,
        borderWidth: compareSelected ? 2 : 1,
        borderColor: compareSelected ? t.brand : recommended ? t.brand + '55' : t.border,
        padding: 14,
        opacity: pressed ? 0.85 : 1,
        marginBottom: 10,
      })}
    >
      <View className="flex-row items-start gap-3">
        {/* Heart button or compare checkbox */}
        {compareMode ? (
          <View
            className="w-9 h-9 rounded-xl items-center justify-center"
            style={{
              backgroundColor: compareSelected ? t.brand : t.border,
              borderWidth: 1,
              borderColor: compareSelected ? t.brand : t.border,
            }}
          >
            {compareSelected ? (
              <Text className="text-white font-bold">✓</Text>
            ) : (
              <View style={{ width: 14, height: 14 }} />
            )}
          </View>
        ) : (
          <Pressable
            onPress={handleWatch}
            hitSlop={10}
            disabled={!amfiCode || !onToggleWatch}
            className="w-9 h-9 rounded-xl items-center justify-center"
            style={{ backgroundColor: isWatched ? t.brand + '22' : t.border }}
          >
            <Heart
              size={15}
              color={isWatched ? t.brand : t.textSecondary}
              fill={isWatched ? t.brand : 'transparent'}
            />
          </Pressable>
        )}

        {/* Text block */}
        <View style={{ flex: 1 }}>
          <Text className="text-[14.5px] font-semibold" style={{ color: t.textPrimary }} numberOfLines={2}>
            {name}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            <Text className="text-[11px]" style={{ color: t.textSecondary }} numberOfLines={1}>
              {category ?? 'Mutual Fund'}
            </Text>
            {recommended && (
              <View className="px-1.5 py-0.5 rounded-md" style={{ backgroundColor: t.brand + '22' }}>
                <Text
                  className="text-[9px] font-extrabold uppercase tracking-wide"
                  style={{ color: t.brand }}
                >
                  Pick
                </Text>
              </View>
            )}
          </View>

          {/* Metrics row */}
          <View className="flex-row items-center mt-2.5 gap-4">
            <Metric label="1Y" value={return1y} />
            <Metric label="3Y" value={return3y} />
            {aumCr != null && (
              <View>
                <Text className="text-[9px] font-bold uppercase" style={{ color: t.textSecondary }}>AUM</Text>
                <Text className="text-[12px] font-semibold" style={{ color: t.textPrimary }}>
                  {aumCr >= 1000 ? `${(aumCr / 1000).toFixed(1)}K Cr` : `${aumCr.toFixed(0)} Cr`}
                </Text>
              </View>
            )}
          </View>
        </View>

        <ScoreBadge score={score ?? null} />
      </View>

      {/* Action row — hidden in compare mode */}
      {!compareMode && (
        <View className="flex-row items-center gap-2 mt-3 pt-3" style={{ borderTopColor: t.border, borderTopWidth: 1 }}>
          <Pressable
            onPress={onPress}
            className="flex-1 py-2 rounded-lg items-center"
            style={{ backgroundColor: t.bg, borderColor: t.border, borderWidth: 1 }}
          >
            <Text className="text-[12px] font-semibold" style={{ color: t.textPrimary }}>
              Details
            </Text>
          </Pressable>
          <Pressable
            onPress={onInvest ?? onPress}
            className="flex-1 py-2 rounded-lg items-center"
            style={{ backgroundColor: t.brand }}
          >
            <Text className="text-[12px] font-semibold text-white">
              Invest
            </Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: number | null | undefined }) {
  const t = useTheme();
  const v = value == null ? null : Number(value);
  const color = v == null ? t.textSecondary : v >= 0 ? '#10b981' : '#ef4444';
  return (
    <View>
      <Text className="text-[9px] font-bold uppercase" style={{ color: t.textSecondary }}>{label}</Text>
      <Text className="text-[12px] font-semibold" style={{ color }}>
        {v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
      </Text>
    </View>
  );
}
