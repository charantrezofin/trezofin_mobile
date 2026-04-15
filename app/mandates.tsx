import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable, Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { ShieldCheck, CheckCircle2, XCircle, Clock, ExternalLink, Building2 } from 'lucide-react-native';
import ScreenHeader from '../components/ui/ScreenHeader';
import Card from '../components/ui/Card';
import { useSession } from '../lib/hooks/useSession';
import { useTheme } from '../lib/theme/ThemeProvider';
import { listMandates, getMandateAuthLink, type MandateItem } from '../lib/api/mandates';

export default function MandatesScreen() {
  const t = useTheme();
  const { accessToken } = useSession();
  const [items, setItems] = useState<MandateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try { setItems(await listMandates(accessToken)); }
    catch (e) { console.warn('mandates load:', (e as Error).message); }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title="Mandates" subtitle={`${items.length} on file`} />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.brand} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
              tintColor={t.brand}
            />
          }
          ListEmptyComponent={
            <Card style={{ alignItems: 'center' }}>
              <ShieldCheck size={28} color={t.textSecondary} />
              <Text className="text-base font-semibold mt-3" style={{ color: t.textPrimary }}>
                No mandates yet
              </Text>
              <Text className="text-[12px] mt-1 text-center" style={{ color: t.textSecondary }}>
                A mandate is created the first time you start a SIP.
              </Text>
            </Card>
          }
          renderItem={({ item }) => <MandateCard m={item} accessToken={accessToken} />}
        />
      )}
    </View>
  );
}

function MandateCard({ m, accessToken }: { m: MandateItem; accessToken: string | null }) {
  const t = useTheme();
  const status = statusInfo(m.status);
  const needsAuth = /pending|created|awaiting/i.test(m.status);

  const auth = async () => {
    if (!accessToken) return;
    try {
      const link = await getMandateAuthLink(accessToken, m.id);
      if (link.auth_url) await WebBrowser.openBrowserAsync(link.auth_url);
      else Alert.alert('No auth link', link.message ?? 'Try again later.');
    } catch (e) { Alert.alert('Failed', (e as Error).message); }
  };

  return (
    <Card padding={14} style={{ marginBottom: 10 }}>
      <View className="flex-row items-start gap-3">
        <View
          className="w-9 h-9 rounded-xl items-center justify-center"
          style={{ backgroundColor: status.bg }}
        >
          {status.icon(status.color)}
        </View>
        <View style={{ flex: 1 }}>
          <Text className="text-[14px] font-semibold" style={{ color: t.textPrimary }}>
            {m.mandate_type} mandate
          </Text>
          <Text className="text-[12px] mt-0.5" style={{ color: t.textSecondary }}>
            Up to ₹{m.amount_limit.toLocaleString('en-IN')}/month
          </Text>
          {m.bank_acc_num ? (
            <View className="flex-row items-center gap-1 mt-1">
              <Building2 size={11} color={t.textSecondary} />
              <Text className="text-[11px]" style={{ color: t.textSecondary }}>
                Acct ••••{String(m.bank_acc_num).slice(-4)}
              </Text>
            </View>
          ) : null}
          <View className="flex-row items-center justify-between mt-2">
            <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: status.bg }}>
              <Text className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: status.color }}>
                {m.status}
              </Text>
            </View>
            {needsAuth ? (
              <Pressable
                onPress={auth}
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ backgroundColor: t.brand }}
              >
                <ExternalLink size={11} color="#ffffff" />
                <Text className="text-[11px] font-semibold text-white">Authorise</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

function statusInfo(status: string): { color: string; bg: string; icon: (c: string) => React.ReactNode } {
  const s = status.toLowerCase();
  if (/active|approved|success/.test(s)) {
    return { color: '#10b981', bg: '#10b98122', icon: (c) => <CheckCircle2 size={16} color={c} /> };
  }
  if (/fail|reject|cancel/.test(s)) {
    return { color: '#ef4444', bg: '#ef444422', icon: (c) => <XCircle size={16} color={c} /> };
  }
  return { color: '#f59e0b', bg: '#f59e0b22', icon: (c) => <Clock size={16} color={c} /> };
}
