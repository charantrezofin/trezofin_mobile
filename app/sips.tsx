import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Repeat, CheckCircle2, XCircle, Clock, ExternalLink, Calendar } from 'lucide-react-native';
import ScreenHeader from '../components/ui/ScreenHeader';
import Card from '../components/ui/Card';
import { useSession } from '../lib/hooks/useSession';
import { useTheme } from '../lib/theme/ThemeProvider';
import { listSips, getSipAuthLink, type SIPItem } from '../lib/api/orders';

export default function SipsScreen() {
  const t = useTheme();
  const { accessToken } = useSession();
  const [sips, setSips] = useState<SIPItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const d = await listSips(accessToken);
      setSips(d);
    } catch (e) {
      console.warn('sips load failed:', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title="My SIPs" subtitle={`${sips.length} active`} />

      {loading ? (
        <View style={{ padding: 20, gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View
              key={i}
              style={{
                height: 100, borderRadius: 16,
                backgroundColor: t.card, borderColor: t.border, borderWidth: 1,
                opacity: 0.6,
              }}
            />
          ))}
        </View>
      ) : (
        <FlatList
          data={sips}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={async () => {
              setRefreshing(true); await load(); setRefreshing(false);
            }} tintColor={t.brand} />
          }
          ListEmptyComponent={
            <Card style={{ alignItems: 'center' }}>
              <Repeat size={28} color={t.textSecondary} />
              <Text className="text-base font-semibold mt-3" style={{ color: t.textPrimary }}>
                No SIPs yet
              </Text>
              <Text className="text-[12px] mt-1 text-center" style={{ color: t.textSecondary }}>
                Start a SIP from any fund to see it here.
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <SipCard sip={item} accessToken={accessToken} />
          )}
        />
      )}
    </View>
  );
}

function SipCard({ sip, accessToken }: { sip: SIPItem; accessToken: string | null }) {
  const t = useTheme();
  const status = statusInfo(sip.status);
  const needsAuth = /pending|auth|awaiting/i.test(sip.status);

  const auth = async () => {
    if (!accessToken) return;
    try {
      const link = await getSipAuthLink(accessToken, sip.id);
      if (link.auth_url) {
        await WebBrowser.openBrowserAsync(link.auth_url);
      } else {
        Alert.alert('No auth link', link.message || 'Try again later.');
      }
    } catch (e) {
      Alert.alert('Failed to get auth link', (e as Error).message);
    }
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
          <Text className="text-[14px] font-semibold" style={{ color: t.textPrimary }} numberOfLines={2}>
            {sip.scheme_name ?? sip.scheme_code}
          </Text>
          <View className="flex-row items-center gap-3 mt-1.5">
            <Text className="text-[12px] font-semibold" style={{ color: t.brand }}>
              ₹{sip.amount.toLocaleString('en-IN')}/{sip.frequency.toLowerCase()}
            </Text>
            {sip.txn_date ? (
              <View className="flex-row items-center gap-1">
                <Calendar size={10} color={t.textSecondary} />
                <Text className="text-[11px]" style={{ color: t.textSecondary }}>
                  {sip.txn_date}th
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row items-center justify-between mt-2">
            <View className="flex-row items-center gap-2">
              <View
                className="px-2 py-0.5 rounded-md"
                style={{ backgroundColor: status.bg }}
              >
                <Text className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: status.color }}>
                  {sip.status}
                </Text>
              </View>
              {sip.completed_installments != null ? (
                <Text className="text-[11px]" style={{ color: t.textSecondary }}>
                  {sip.completed_installments} installments done
                </Text>
              ) : null}
            </View>
            {needsAuth ? (
              <Pressable
                onPress={auth}
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ backgroundColor: t.brand }}
              >
                <ExternalLink size={11} color="#ffffff" />
                <Text className="text-[11px] font-semibold text-white">Authenticate</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

function statusInfo(status: string): {
  color: string;
  bg: string;
  icon: (c: string) => React.ReactNode;
} {
  const s = status.toLowerCase();
  if (/active|success/.test(s)) {
    return {
      color: '#10b981', bg: '#10b98122',
      icon: (c) => <CheckCircle2 size={16} color={c} />,
    };
  }
  if (/fail|reject|stop|cancel/.test(s)) {
    return {
      color: '#ef4444', bg: '#ef444422',
      icon: (c) => <XCircle size={16} color={c} />,
    };
  }
  return {
    color: '#f59e0b', bg: '#f59e0b22',
    icon: (c) => <Clock size={16} color={c} />,
  };
}
