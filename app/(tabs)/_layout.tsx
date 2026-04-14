import { Tabs } from 'expo-router';
import { useTheme } from '../../lib/theme/ThemeProvider';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.border,
          paddingTop: 6,
          height: 64,
        },
        tabBarActiveTintColor: t.brand,
        tabBarInactiveTintColor: t.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home'      }} />
      <Tabs.Screen name="funds"    options={{ title: 'Funds'     }} />
      <Tabs.Screen name="chat"     options={{ title: 'Chat'      }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile'   }} />
    </Tabs>
  );
}
