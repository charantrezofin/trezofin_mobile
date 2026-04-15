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
import { Wallet, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react-native';
import ScreenHeader from '../components/ui/ScreenHeader';
import Card from '../components/ui/Card';
import { useSession } from '../lib/hooks/useSession';
import { useTheme } from '../lib/theme/ThemeProvider';
import { listOrders, getPaymentLink, type OrderItem } from '../lib/api/orders';

export default function OrdersScreen() {
  const t = useTheme();
  const { accessToken } = useSession();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const d = await listOrders(accessToken);
      setOrders(d);
    } catch (e) {
      console.warn('orders load failed:', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title="My Orders" subtitle={`${orders.length} total`} />

      {loading ? (
        <View style={{ padding: 20, gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View
              key={i}
              style={{
                height: 90, borderRadius: 16,
                backgroundColor: t.card, borderColor: t.border, borderWidth: 1,
                opacity: 0.6,
              }}
            />
          ))}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={async () => {
              setRefreshing(true); await load(); setRefreshing(false);
            }} tintColor={t.brand} />
          }
          ListEmptyComponent={
            <Card style={{ alignItems: 'center' }}>
              <Wallet size={28} color={t.textSecondary} />
              <Text className="text-base font-semibold mt-3" style={{ color: t.textPrimary }}>
                No orders yet
              </Text>
              <Text className="text-[12px] mt-1 text-center" style={{ color: t.textSecondary }}>
                Your lumpsum purchases will appear here.
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <OrderCard order={item} accessToken={accessToken} />
          )}
        />
      )}
    </View>
  );
}

function OrderCard({ order, accessToken }: { order: OrderItem; accessToken: string | null }) {
  const t = useTheme();
  const status = statusInfo(order.status);
  const needsPayment = /pending|awaiting/i.test(order.status);

  const pay = async () => {
    if (!accessToken) return;
    try {
      const link = await getPaymentLink(accessToken, order.id);
      if (link.auth_url) {
        await WebBrowser.openBrowserAsync(link.auth_url);
      } else {
        Alert.alert('No payment link', link.message || 'Try again later.');
      }
    } catch (e) {
      Alert.alert('Failed to get payment link', (e as Error).message);
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
            {order.scheme_name ?? order.scheme_code}
          </Text>
          <Text className="text-[11px] mt-1" style={{ color: t.textSecondary }} numberOfLines={1}>
            {order.order_type} · ₹{order.amount.toLocaleString('en-IN')} · {formatDate(order.created_at)}
          </Text>
          <View className="flex-row items-center justify-between mt-2">
            <View
              className="px-2 py-0.5 rounded-md"
              style={{ backgroundColor: status.bg }}
            >
              <Text className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: status.color }}>
                {order.status}
              </Text>
            </View>
            {needsPayment ? (
              <Pressable
                onPress={pay}
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ backgroundColor: t.brand }}
              >
                <ExternalLink size={11} color="#ffffff" />
                <Text className="text-[11px] font-semibold text-white">Pay now</Text>
              </Pressable>
            ) : order.allotted_units ? (
              <Text className="text-[11px]" style={{ color: t.textSecondary }}>
                {order.allotted_units.toFixed(3)} units @ ₹{order.allotment_nav?.toFixed(2) ?? '—'}
              </Text>
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
  if (/success|allotted|complete/.test(s)) {
    return {
      color: '#10b981', bg: '#10b98122',
      icon: (c) => <CheckCircle2 size={16} color={c} />,
    };
  }
  if (/fail|reject|error|cancel/.test(s)) {
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

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}
