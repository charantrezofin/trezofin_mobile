import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../lib/theme/ThemeProvider';

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
};

export default function ScreenHeader({ title, subtitle, right, onBack }: Props) {
  const t = useTheme();
  return (
    <SafeAreaView
      edges={['top']}
      style={{
        backgroundColor: t.bg,
        borderBottomColor: t.border,
        borderBottomWidth: 0,
      }}
    >
      <View className="flex-row items-center px-4 pt-2 pb-3 gap-3">
        <Pressable
          onPress={() => (onBack ? onBack() : router.back())}
          hitSlop={10}
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: t.card, borderColor: t.border, borderWidth: 1 }}
        >
          <ChevronLeft size={18} color={t.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text className="text-lg font-bold" style={{ color: t.textPrimary }} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-[12px]" style={{ color: t.textSecondary }} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    </SafeAreaView>
  );
}
