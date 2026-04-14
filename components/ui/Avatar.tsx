import { View, Text } from 'react-native';

/** Circular avatar with initials + brand-ish gradient-feel background. */
export default function Avatar({
  name,
  size = 48,
  color = '#00d09c',
}: {
  name?: string | null;
  size?: number;
  color?: string;
}) {
  const initials = (name ?? 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || 'U';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#ffffff',
          fontSize: size * 0.4,
          fontWeight: '700',
          letterSpacing: 0.5,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
