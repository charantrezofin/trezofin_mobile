/**
 * Orders — unified list with three internal tabs:
 *
 *   All       — merged chronological list of lumpsum orders + SIPs
 *   Lumpsum   — standalone lumpsum purchases (order.sip_id is null)
 *   SIPs      — active + pending SIPs
 *
 * Each row shows status pill + primary action (Pay now / Authenticate)
 * when relevant. Status pill colour:
 *   success/allotted/active  -> emerald
 *   pending/awaiting/created -> amber
 *   fail/reject/cancel       -> red
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable, Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  Wallet, Repeat, CheckCircle2, XCircle, Clock, ExternalLink, Calendar,
} from 'lucide-react-native';
import ScreenHeader from '../components/ui/ScreenHeader';
import Card from '../components/ui/Card';
import { useSession } from '../lib/hooks/useSession';
import { useTheme } from '../lib/theme/ThemeProvider';
import {
  listOrders, listSips, getPaymentLink, getSipAuthLink,
  type OrderItem, type SIPItem,
} from '../lib/api/orders';

type Tab = 'all' | 'lumpsum' | 'sips';

type Row =
  | { kind: 'order'; ts: number; data: OrderItem }
  | { kind: 'sip';   ts: number; data: SIPItem };

export default function OrdersScreen() {
  const t = useTheme();
  const { accessToken } = useSession();
  const [tab, setTab] = useState<Tab>('all');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [sips,   setSips]   = useState<SIPItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [o, s] = await Promise.all([
        listOrders(accessToken).catch(() => [] as OrderItem[]),
        listSips(accessToken).catch(() => [] as SIPItem[]),
      ]);
      setOrders(o);
      setSips(s);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  // Bucket counts shown on tab chips
  const lumpsumOrders = useMemo(
    () => orders.filter((o) => !o.sip_id),
    [orders],
  );

  const rows = useMemo<Row[]>(() => {
    if (tab === 'lumpsum') {
      return lumpsumOrders
        .map((o) => ({ kind: 'order' as const, ts: parseTs(o.created_at), data: o }))
        .sort((a, b) => b.ts - a.ts);
    }
    if (tab === 'sips') {
      return sips
        .map((s) => ({ kind: 'sip' as const, ts: parseTs(s.created_at), data: s }))
        .sort((a, b) => b.ts - a.ts);
    }
    // 'all' — merge both, most recent first
    return [
      ...orders.map((o) => ({ kind: 'order' as const, ts: parseTs(o.created_at), data: o })),
      ...sips.map((s)   => ({ kind: 'sip'   as const, ts: parseTs(s.created_at), data: s })),
    ].sort((a, b) => b.ts - a.ts);
  }, [tab, orders, lumpsumOrders, sips]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title="My Orders"
        subtitle={`${orders.length + sips.length} total`}
      />

      {/* Tabs */}
      <View className="flex-row gap-2 px-5 mb-2">
        <TabChip label="All"     count={orders.length + sips.length} active={tab === 'all'}     onPress={() => setTab('all')} />
        <TabChip label="Lumpsum" count={lumpsumOrders.length}         active={tab === 'lumpsum'} onPress={() => setTab('lumpsum')} />
        <TabChip label="SIPs"    count={sips.length}                  active={tab === 'sips'}    onPress={() => setTab('sips')} />
      </View>

      {loading ? (
        <View style={{ padding: 20, gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View
              key={i}
              style={{
                height: 96, borderRadius: 16,
                backgroundColor: t.card, borderColor: t.border, borderWidth: 1,
                opacity: 0.6,
              }}
            />
          ))}
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => `${r.kind}-${r.data.id}`}
          contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
              tintColor={t.brand}
            />
          }
          ListEmptyComponent={<EmptyState tab={tab} />}
          renderItem={({ item }) =>
            item.kind === 'order'
              ? <OrderRow order={item.data} accessToken={accessToken} />
              : <SipRow sip={item.data} accessToken={accessToken} />
          }
        />
      )}
    </View>
  );
}

// ── Tabs ────────────────────────────────────────────────────────────────────

function TabChip({
  label, count, active, onPress,
}: { label: string; count: number; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
        backgroundColor: active ? t.brand : t.card,
        borderColor: active ? t.brand : t.border, borderWidth: 1,
        flexDirection: 'row', alignItems: 'center', gap: 6,
      }}
    >
      <Text style={{ color: active ? '#ffffff' : t.textPrimary, fontWeight: '600', fontSize: 12 }}>
        {label}
      </Text>
      <View
        style={{
          paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999,
          backgroundColor: active ? 'rgba(255,255,255,0.25)' : t.bg,
        }}
      >
        <Text style={{ color: active ? '#ffffff' : t.textSecondary, fontWeight: '700', fontSize: 10 }}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }) {
  const t = useTheme();
  const Icon = tab === 'sips' ? Repeat : Wallet;
  const title = tab === 'sips'    ? 'No SIPs yet'
              : tab === 'lumpsum' ? 'No lumpsum orders yet'
              :                     'Nothing here yet';
  const sub   = tab === 'sips'
    ? 'Start a SIP from any fund to see it here.'
    : tab === 'lumpsum'
      ? 'Your lumpsum purchases will appear here.'
      : 'Your orders and SIPs will appear here.';
  return (
    <Card style={{ alignItems: 'center' }}>
      <Icon size={28} color={t.textSecondary} />
      <Text className="text-base font-semibold mt-3" style={{ color: t.textPrimary }}>
        {title}
      </Text>
      <Text className="text-[12px] mt-1 text-center" style={{ color: t.textSecondary }}>
        {sub}
      </Text>
    </Card>
  );
}

// ── Order row ───────────────────────────────────────────────────────────────

function OrderRow({ order, accessToken }: { order: OrderItem; accessToken: string | null }) {
  const t = useTheme();
  const s = statusInfo(order.status);
  const needsPayment = /pending|awaiting/i.test(order.status);

  const pay = async () => {
    if (!accessToken) return;
    try {
      const link = await getPaymentLink(accessToken, order.id);
      if (link.auth_url) await WebBrowser.openBrowserAsync(link.auth_url);
      else Alert.alert('No payment link', link.message || 'Try again later.');
    } catch (e) { Alert.alert('Failed', (e as Error).message); }
  };

  return (
    <Card padding={14} style={{ marginBottom: 10 }}>
      <View className="flex-row items-start gap-3">
        <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: s.bg }}>
          {s.icon(s.color)}
        </View>
        <View style={{ flex: 1 }}>
          <View className="flex-row items-center gap-2">
            <View className="px-1.5 py-0.5 rounded-md" style={{ backgroundColor: t.border }}>
              <Text className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: t.textSecondary }}>
                Lumpsum
              </Text>
            </View>
            <Text className="text-[11px]" style={{ color: t.textSecondary }}>
              {formatDate(order.created_at)}
            </Text>
          </View>
          <Text className="text-[14px] font-semibold mt-1" style={{ color: t.textPrimary }} numberOfLines={2}>
            {order.scheme_name ?? order.scheme_code}
          </Text>
          <Text className="text-[12px] mt-0.5" style={{ color: t.textSecondary }}>
            ₹{order.amount.toLocaleString('en-IN')} · {order.order_type}
          </Text>
          <View className="flex-row items-center justify-between mt-2">
            <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: s.bg }}>
              <Text className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: s.color }}>
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

// ── SIP row ─────────────────────────────────────────────────────────────────

function SipRow({ sip, accessToken }: { sip: SIPItem; accessToken: string | null }) {
  const t = useTheme();
  const s = statusInfo(sip.status);
  const needsAuth = /pending|auth|awaiting|created/i.test(sip.status);

  const auth = async () => {
    if (!accessToken) return;
    try {
      const link = await getSipAuthLink(accessToken, sip.id);
      if (link.auth_url) await WebBrowser.openBrowserAsync(link.auth_url);
      else Alert.alert('No auth link', link.message || 'Try again later.');
    } catch (e) { Alert.alert('Failed', (e as Error).message); }
  };

  return (
    <Card padding={14} style={{ marginBottom: 10 }}>
      <View className="flex-row items-start gap-3">
        <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: s.bg }}>
          {s.icon(s.color)}
        </View>
        <View style={{ flex: 1 }}>
          <View className="flex-row items-center gap-2">
            <View className="px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#0ea5e922' }}>
              <Text className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: '#0ea5e9' }}>
                SIP
              </Text>
            </View>
            {sip.txn_date ? (
              <View className="flex-row items-center gap-1">
                <Calendar size={10} color={t.textSecondary} />
                <Text className="text-[11px]" style={{ color: t.textSecondary }}>{sip.txn_date}th of every month</Text>
              </View>
            ) : null}
          </View>
          <Text className="text-[14px] font-semibold mt-1" style={{ color: t.textPrimary }} numberOfLines={2}>
            {sip.scheme_name ?? sip.scheme_code}
          </Text>
          <Text className="text-[12px] mt-0.5" style={{ color: t.brand, fontWeight: '600' }}>
            ₹{sip.amount.toLocaleString('en-IN')} / {sip.frequency.toLowerCase()}
          </Text>
          <View className="flex-row items-center justify-between mt-2">
            <View className="flex-row items-center gap-2">
              <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: s.bg }}>
                <Text className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: s.color }}>
                  {sip.status}
                </Text>
              </View>
              {sip.completed_installments != null ? (
                <Text className="text-[11px]" style={{ color: t.textSecondary }}>
                  {sip.completed_installments} done
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

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseTs(iso: string): number {
  try { return new Date(iso).getTime() || 0; } catch { return 0; }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function statusInfo(status: string): {
  color: string; bg: string; icon: (c: string) => React.ReactNode;
} {
  const s = status.toLowerCase();
  if (/success|allotted|complete|active|approved/.test(s)) {
    return { color: '#10b981', bg: '#10b98122', icon: (c) => <CheckCircle2 size={16} color={c} /> };
  }
  if (/fail|reject|error|cancel|stop/.test(s)) {
    return { color: '#ef4444', bg: '#ef444422', icon: (c) => <XCircle size={16} color={c} /> };
  }
  return { color: '#f59e0b', bg: '#f59e0b22', icon: (c) => <Clock size={16} color={c} /> };
}
