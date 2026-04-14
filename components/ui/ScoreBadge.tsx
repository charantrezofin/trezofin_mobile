import { View, Text } from 'react-native';

export default function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) {
    return (
      <View className="px-2 py-0.5 rounded-md bg-slate-200">
        <Text className="text-[11px] font-bold text-slate-500">—</Text>
      </View>
    );
  }
  const n = Number(score);
  const bg =
    n >= 8 ? '#10b981' : n >= 7 ? '#22c55e' : n >= 6 ? '#eab308' : '#f97316';
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: bg }}>
      <Text className="text-[11px] font-extrabold text-white">{n.toFixed(1)}</Text>
    </View>
  );
}
