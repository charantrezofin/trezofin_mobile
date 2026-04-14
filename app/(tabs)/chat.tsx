import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme/ThemeProvider';

export default function Chat() {
  const t = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View className="flex-1 items-center justify-center px-8">
        <Text
          className="text-2xl font-bold mb-2"
          style={{ color: t.textPrimary }}
        >
          Chat with Tara
        </Text>
        <Text
          className="text-sm text-center"
          style={{ color: t.textSecondary }}
        >
          Text-only assistant — voice lives on the Home tab.
        </Text>
      </View>
    </SafeAreaView>
  );
}
