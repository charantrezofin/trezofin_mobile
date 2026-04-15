import { View, Text } from 'react-native';

export default function ScoreBadge({ score }: { score: number | null | undefined }) {
  // Hide the badge entirely when we don't have a score — showing "—"
  // reads like a broken element to users.
  if (score == null) return null;
  const n = Number(score);
  const bg =
    n >= 8 ? '#10b981' : n >= 7 ? '#22c55e' : n >= 6 ? '#eab308' : '#f97316';
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: bg }}>
      <Text className="text-[11px] font-extrabold text-white">{n.toFixed(1)}</Text>
    </View>
  );
}
