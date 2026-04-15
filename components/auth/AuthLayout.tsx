import {
  View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../lib/theme/ThemeProvider';

type Props = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/** Shared hero + keyboard-avoiding layout for every auth screen. */
export default function AuthLayout({ title, subtitle, showBack, children, footer }: Props) {
  const t = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showBack ? (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="w-10 h-10 rounded-full items-center justify-center mb-6"
              style={{ backgroundColor: t.card, borderColor: t.border, borderWidth: 1 }}
            >
              <ChevronLeft size={18} color={t.textPrimary} />
            </Pressable>
          ) : (
            <View style={{ height: 48 }} />
          )}

          {/* Logo dot + wordmark */}
          <View className="flex-row items-center gap-2 mb-6">
            <View
              style={{
                width: 28, height: 28, borderRadius: 8,
                backgroundColor: t.brand,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 14 }}>T</Text>
            </View>
            <Text className="text-base font-bold" style={{ color: t.textPrimary }}>
              Trezofin AI
            </Text>
          </View>

          <Text className="text-3xl font-bold" style={{ color: t.textPrimary }}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-[14px] mt-2" style={{ color: t.textSecondary }}>
              {subtitle}
            </Text>
          ) : null}

          <View style={{ marginTop: 28 }}>
            {children}
          </View>

          <View style={{ flex: 1 }} />

          {footer ? <View style={{ marginTop: 16 }}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
