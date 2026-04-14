import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase/client';
import { useTheme } from '../../lib/theme/ThemeProvider';

export default function Profile() {
  const t = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View className="flex-1 items-center justify-center px-8 gap-6">
        <Text
          className="text-2xl font-bold"
          style={{ color: t.textPrimary }}
        >
          Profile
        </Text>
        <Text
          className="text-sm text-center"
          style={{ color: t.textSecondary }}
        >
          Theme toggle, language default, saved speaker, and account
          settings ship here next.
        </Text>
        <Pressable
          onPress={() => supabase.auth.signOut()}
          className="rounded-2xl px-6 py-3"
          style={{ backgroundColor: t.brand }}
        >
          <Text className="text-white font-semibold">Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
