import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { getProfileFull, uccIncomplete } from '../../lib/api/profile';
import { TrendingUp, Wallet, Calendar, Repeat, Clock, X, Info, Heart, Banknote } from 'lucide-react-native';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { useWatchlist } from '../../lib/hooks/useWatchlist';
import Card from '../../components/ui/Card';
import ScoreBadge from '../../components/ui/ScoreBadge';
import NavChart from '../../components/charts/NavChart';
import CalendarYearsChart from '../../components/charts/CalendarYearsChart';
import { getFundAnalytics, type FundAnalyticsDetail } from '../../lib/api/fund-analytics';
import { useSession } from '../../lib/hooks/useSession';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { supabase } from '../../lib/supabase/client';
import { getSchemeByIsin, type SchemeDetail } from '../../lib/api/client';
import type { Fund } from '../../lib/api/funds';
import {
  placeLumpsum,
  getPaymentLink,
  placeSip,
  getSipAuthLink,
  placeRedeem,
} from '../../lib/api/orders';

type Mode = null | 'lumpsum' | 'sip' | 'redeem';

export default function FundDetail() {
  const t = useTheme();
  const { isin } = useLocalSearchParams<{ isin: string }>();
  const { accessToken } = useSession();

  const [sbFund, setSbFund]   = useState<Fund | null>(null);
  const [scheme, setScheme]   = useState<SchemeDetail | null>(null);
  const [analytics, setAnalytics] = useState<FundAnalyticsDetail | null>(null);
  const [loadingSupabase, setLoadingSupabase] = useState(true);
  const [loadingBse,      setLoadingBse]      = useState(true);
  const [bseError,        setBseError]        = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const { isWatched, toggle } = useWatchlist();
  const [uccNeeded, setUccNeeded] = useState(false);

  // UCC gate: if the user hasn't completed onboarding, BSE will reject
  // any order. Probe once when the detail page loads so we can route to
  // onboarding instead of letting the order fail.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getProfileFull(accessToken);
        if (!cancelled) setUccNeeded(uccIncomplete(p));
      } catch { /* ignore — don't block the page */ }
    })();
    return () => { cancelled = true; };
  }, [accessToken]);

  const guardOrRun = (fn: () => void) => {
    if (uccNeeded) {
      Alert.alert(
        'Finish onboarding first',
        'Complete your UCC registration to start investing. It takes about 3 minutes.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Start now', onPress: () => router.push('/onboarding') },
        ],
      );
      return;
    }
    fn();
  };

  // Load Supabase fund meta (score, returns) + BSE scheme detail (limits).
  useEffect(() => {
    if (!isin) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('funds')
          .select('*')
          .eq('isin', isin)
          .maybeSingle();
        if (!cancelled) setSbFund(data as Fund | null);
        const amfi = (data as Fund | null)?.amfi_code;
        if (amfi) {
          const a = await getFundAnalytics(amfi);
          if (!cancelled) setAnalytics(a);
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingSupabase(false); }
    })();

    (async () => {
      if (!accessToken) return;
      try {
        const s = await getSchemeByIsin(accessToken, String(isin));
        if (!cancelled) setScheme(s);
      } catch (e) {
        if (!cancelled) setBseError((e as Error).message);
      } finally {
        if (!cancelled) setLoadingBse(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isin, accessToken]);

  const name     = scheme?.name ?? sbFund?.fund_name ?? 'Fund';
  const category = scheme?.category ?? sbFund?.category ?? '';
  const amc      = scheme?.amc_name ?? '';
  const score    = sbFund?.trezofin_score ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title="Fund details"
        subtitle={amc || undefined}
        right={
          sbFund?.amfi_code ? (
            <Pressable
              onPress={async () => {
                try { await toggle(sbFund.amfi_code!); }
                catch (e) { Alert.alert('Oops', (e as Error).message); }
              }}
              hitSlop={10}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{
                backgroundColor: isWatched(sbFund.amfi_code) ? t.brand + '22' : t.card,
                borderColor: t.border, borderWidth: 1,
              }}
            >
              <Heart
                size={16}
                color={isWatched(sbFund.amfi_code) ? t.brand : t.textSecondary}
                fill={isWatched(sbFund.amfi_code) ? t.brand : 'transparent'}
              />
            </Pressable>
          ) : null
        }
      />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {/* Name + score */}
        <Card padding={18} style={{ marginBottom: 14 }}>
          <View className="flex-row items-start gap-3">
            <View style={{ flex: 1 }}>
              <Text className="text-[18px] font-bold" style={{ color: t.textPrimary }}>
                {name}
              </Text>
              <Text className="text-[12px] mt-1" style={{ color: t.textSecondary }} numberOfLines={2}>
                {category}{scheme?.sub_category ? ` · ${scheme.sub_category}` : ''}
              </Text>
              {amc ? (
                <Text className="text-[11px] mt-1" style={{ color: t.textSecondary }}>
                  {amc}
                </Text>
              ) : null}
            </View>
            <ScoreBadge score={score} />
          </View>
        </Card>

        {/* NAV trend chart */}
        <Text
          className="text-[10px] font-bold uppercase tracking-widest mb-2 ml-1"
          style={{ color: t.textSecondary }}
        >
          NAV trend
        </Text>
        <Card padding={16} style={{ marginBottom: 14 }}>
          {isin ? <NavChart isin={String(isin)} /> : null}
        </Card>

        {/* Returns grid */}
        <Text
          className="text-[10px] font-bold uppercase tracking-widest mb-2 ml-1"
          style={{ color: t.textSecondary }}
        >
          Returns
        </Text>
        <Card padding={16} style={{ marginBottom: 14 }}>
          {loadingSupabase ? (
            <ActivityIndicator color={t.brand} />
          ) : (
            <View className="flex-row justify-between">
              <Metric label="1Y"    value={sbFund?.return_1y} />
              <Metric label="3Y"    value={sbFund?.return_3y} />
              <Metric label="5Y"    value={sbFund?.return_5y} />
              <Metric label="Sharpe" raw={sbFund?.sharpe?.toFixed(2)} />
            </View>
          )}
        </Card>

        {/* Calendar year returns */}
        {analytics?.calendar_years?.length ? (
          <>
            <Text
              className="text-[10px] font-bold uppercase tracking-widest mb-2 ml-1"
              style={{ color: t.textSecondary }}
            >
              Calendar year returns
            </Text>
            <Card padding={16} style={{ marginBottom: 14 }}>
              <CalendarYearsChart data={analytics.calendar_years} />
            </Card>
          </>
        ) : null}

        {/* Rolling returns */}
        {analytics?.rolling_returns ? (
          <>
            <Text
              className="text-[10px] font-bold uppercase tracking-widest mb-2 ml-1"
              style={{ color: t.textSecondary }}
            >
              Rolling 3Y returns
            </Text>
            <Card padding={16} style={{ marginBottom: 14 }}>
              <View className="flex-row flex-wrap">
                <RollingCell label="Avg" pct={analytics.rolling_returns.avg_return} />
                <RollingCell label="High" pct={analytics.rolling_returns.high} />
                <RollingCell label="Low" pct={analytics.rolling_returns.low} />
                <RollingCell label="Volatility" pct={analytics.rolling_returns.volatility} />
                <RollingCell label="Positive %" pct={analytics.rolling_returns.positive_pct} />
              </View>
            </Card>
          </>
        ) : null}

        {/* SIP returns */}
        {analytics?.sip_returns?.xirr != null ? (
          <>
            <Text
              className="text-[10px] font-bold uppercase tracking-widest mb-2 ml-1"
              style={{ color: t.textSecondary }}
            >
              SIP · ₹10,000 / month · 5 years
            </Text>
            <Card padding={16} style={{ marginBottom: 14 }}>
              <View className="flex-row gap-4">
                <SipCell label="Invested" value={fmtRupees(analytics.sip_returns.invested_value)} />
                <SipCell label="Value now" value={fmtRupees(analytics.sip_returns.final_value)} />
                <SipCell label="XIRR"
                  value={`${analytics.sip_returns.xirr >= 0 ? '+' : ''}${analytics.sip_returns.xirr.toFixed(1)}%`}
                  color={analytics.sip_returns.xirr >= 0 ? '#10b981' : '#ef4444'}
                />
              </View>
            </Card>
          </>
        ) : null}

        {/* AUM + risk strip */}
        <Card padding={16} style={{ marginBottom: 14 }}>
          <View className="flex-row justify-between">
            <View style={{ flex: 1 }}>
              <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.textSecondary }}>
                AUM
              </Text>
              <Text className="text-base font-semibold mt-1" style={{ color: t.textPrimary }}>
                {sbFund?.aum_cr
                  ? sbFund.aum_cr >= 1000
                    ? `${(sbFund.aum_cr / 1000).toFixed(1)}K Cr`
                    : `${sbFund.aum_cr.toFixed(0)} Cr`
                  : '—'}
              </Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: t.border }}>
              <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.textSecondary }}>
                Risk profile
              </Text>
              <Text className="text-base font-semibold mt-1" style={{ color: t.textPrimary }} numberOfLines={1}>
                {sbFund?.risk_category ?? '—'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Minimum investment — compact two-column summary */}
        {scheme && (
          <Card padding={16} style={{ marginBottom: 14, flexDirection: 'row' }}>
            <View style={{ flex: 1 }}>
              <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.textSecondary }}>
                Min. Lumpsum
              </Text>
              <Text className="text-lg font-bold mt-1" style={{ color: t.textPrimary }}>
                ₹{scheme.lumpsum.purchase.min_amount.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: t.border }}>
              <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.textSecondary }}>
                Min. SIP
              </Text>
              <Text className="text-lg font-bold mt-1" style={{ color: t.textPrimary }}>
                {scheme.systematic
                  ? `₹${scheme.systematic.min_amount.toLocaleString('en-IN')}`
                  : '—'}
              </Text>
            </View>
          </Card>
        )}
        {bseError && !scheme && (
          <Card style={{ marginBottom: 14 }}>
            <View className="flex-row items-start gap-2">
              <Info size={14} color={t.textSecondary} />
              <Text className="text-[12px]" style={{ color: t.textSecondary }}>
                Live scheme data unavailable: {bseError}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Action bar */}
      <View
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          backgroundColor: t.card,
          borderTopColor: t.border, borderTopWidth: 1,
          padding: 14, paddingBottom: 28,
          flexDirection: 'row', gap: 8,
        }}
      >
        <Pressable
          onPress={() => guardOrRun(() => setMode('redeem'))}
          disabled={!scheme}
          style={{
            paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14,
            backgroundColor: scheme ? t.card : t.border,
            borderWidth: 1, borderColor: scheme ? '#ef4444' : t.border,
            alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
          }}
        >
          <Banknote size={15} color={scheme ? '#ef4444' : t.textSecondary} />
          <Text style={{ color: scheme ? '#ef4444' : t.textSecondary, fontWeight: '600', fontSize: 13 }}>
            Redeem
          </Text>
        </Pressable>
        <Pressable
          onPress={() => guardOrRun(() => setMode('lumpsum'))}
          disabled={!scheme}
          style={{
            flex: 1, paddingVertical: 14, borderRadius: 14,
            backgroundColor: scheme ? t.brand : t.border,
            alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}
        >
          <Wallet size={16} color="#ffffff" />
          <Text className="text-white font-semibold">Lumpsum</Text>
        </Pressable>
        <Pressable
          onPress={() => guardOrRun(() => setMode('sip'))}
          disabled={!scheme?.systematic}
          style={{
            flex: 1, paddingVertical: 14, borderRadius: 14,
            backgroundColor: scheme?.systematic ? '#0ea5e9' : t.border,
            alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}
        >
          <Repeat size={16} color="#ffffff" />
          <Text className="text-white font-semibold">SIP</Text>
        </Pressable>
      </View>

      {/* Invest / Redeem modals */}
      <InvestModal
        mode={mode === 'lumpsum' || mode === 'sip' ? mode : null}
        scheme={scheme}
        onClose={() => setMode(null)}
      />
      <RedeemModal
        visible={mode === 'redeem'}
        scheme={scheme}
        onClose={() => setMode(null)}
      />
    </View>
  );
}

// ── Redeem modal ─────────────────────────────────────────────────────────────

function RedeemModal({
  visible, scheme, onClose,
}: {
  visible: boolean;
  scheme: SchemeDetail | null;
  onClose: () => void;
}) {
  const t = useTheme();
  const { accessToken } = useSession();
  const [folio, setFolio] = useState('');
  const [units, setUnits] = useState('');
  const [allUnits, setAllUnits] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) { setFolio(''); setUnits(''); setAllUnits(true); }
  }, [visible]);

  if (!visible || !scheme) return null;

  const valid = folio.trim().length >= 3 && (allUnits || Number(units) > 0);

  const submit = async () => {
    if (!valid || !accessToken || !scheme.bse_code) return;
    setSubmitting(true);
    try {
      const res = await placeRedeem(accessToken, {
        scheme_code: scheme.bse_code,
        scheme_name: scheme.name,
        isin: scheme.isin,
        folio_num: folio.trim(),
        all_units: allUnits,
        is_units: true,
        units: allUnits ? 0 : Number(units) || 0,
      });
      onClose();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (res.auth_url) {
        await WebBrowser.openBrowserAsync(res.auth_url);
      } else {
        Alert.alert(
          res.success ? 'Redemption placed' : 'Heads up',
          res.message || 'Your redemption has been submitted. Check Orders for status.',
        );
      }
    } catch (e) {
      Alert.alert('Redemption failed', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              backgroundColor: t.card,
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 20, paddingBottom: 36,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold" style={{ color: t.textPrimary }}>
                Redeem units
              </Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <X size={18} color={t.textSecondary} />
              </Pressable>
            </View>

            <Text className="text-[12px] mb-1.5 ml-1" style={{ color: t.textSecondary }}>
              Folio number
            </Text>
            <TextInput
              value={folio}
              onChangeText={setFolio}
              placeholder="e.g. 1234567 / 00"
              placeholderTextColor={t.textSecondary}
              autoCapitalize="none"
              style={{
                backgroundColor: t.bg,
                borderColor: t.border, borderWidth: 1, borderRadius: 14,
                paddingHorizontal: 14, paddingVertical: 12,
                color: t.textPrimary, fontSize: 15, fontWeight: '600',
              }}
            />

            <View className="flex-row items-center gap-2 mt-4">
              <Pressable
                onPress={() => setAllUnits(true)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 12,
                  backgroundColor: allUnits ? '#ef4444' : t.bg,
                  borderColor: allUnits ? '#ef4444' : t.border, borderWidth: 1,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: allUnits ? '#ffffff' : t.textPrimary, fontWeight: '600' }}>
                  All units
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setAllUnits(false)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 12,
                  backgroundColor: !allUnits ? '#ef4444' : t.bg,
                  borderColor: !allUnits ? '#ef4444' : t.border, borderWidth: 1,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: !allUnits ? '#ffffff' : t.textPrimary, fontWeight: '600' }}>
                  Specific units
                </Text>
              </Pressable>
            </View>

            {!allUnits && (
              <>
                <Text className="text-[12px] mt-4 mb-1.5 ml-1" style={{ color: t.textSecondary }}>
                  Units to redeem
                </Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={units}
                  onChangeText={setUnits}
                  placeholder="e.g. 100.000"
                  placeholderTextColor={t.textSecondary}
                  style={{
                    backgroundColor: t.bg,
                    borderColor: t.border, borderWidth: 1, borderRadius: 14,
                    paddingHorizontal: 14, paddingVertical: 12,
                    color: t.textPrimary, fontSize: 18, fontWeight: '700',
                  }}
                />
              </>
            )}

            <Pressable
              onPress={submit}
              disabled={!valid || submitting}
              style={{
                marginTop: 18, paddingVertical: 14, borderRadius: 14,
                backgroundColor: !valid || submitting ? t.border : '#ef4444',
                alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
              }}
            >
              {submitting ? <ActivityIndicator color="#ffffff" /> : (
                <>
                  <Banknote size={16} color="#ffffff" />
                  <Text className="text-white font-semibold">Submit redemption</Text>
                </>
              )}
            </Pressable>
            <Text className="text-[10px] text-center mt-3" style={{ color: t.textSecondary }}>
              Redemptions settle to your registered bank account in 2–3 business days.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function RollingCell({ label, pct }: { label: string; pct: number | null | undefined }) {
  const t = useTheme();
  const color = label === 'Volatility' ? t.textPrimary
    : pct == null ? t.textSecondary
    : pct >= 0 ? '#10b981' : '#ef4444';
  return (
    <View style={{ width: '33.333%', paddingVertical: 6 }}>
      <Text className="text-[10px] font-bold uppercase" style={{ color: t.textSecondary }}>{label}</Text>
      <Text className="text-[13px] font-bold mt-0.5" style={{ color }}>
        {pct == null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`}
      </Text>
    </View>
  );
}

function SipCell({ label, value, color }: { label: string; value: string; color?: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text className="text-[10px] font-bold uppercase" style={{ color: t.textSecondary }}>{label}</Text>
      <Text className="text-[14px] font-bold mt-0.5" style={{ color: color ?? t.textPrimary }}>{value}</Text>
    </View>
  );
}

function fmtRupees(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function Metric({
  label, value, raw,
}: { label: string; value?: number | null; raw?: string }) {
  const t = useTheme();
  const text = raw != null
    ? raw
    : value == null ? '—'
    : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  const color = raw != null ? t.textPrimary
    : value == null ? t.textSecondary
    : value >= 0 ? '#10b981' : '#ef4444';
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text className="text-[10px] font-bold uppercase" style={{ color: t.textSecondary }}>{label}</Text>
      <Text className="text-[15px] font-bold mt-1" style={{ color }}>{text}</Text>
    </View>
  );
}

// ── Invest modal ─────────────────────────────────────────────────────────────

function InvestModal({
  mode, scheme, onClose,
}: {
  mode: 'lumpsum' | 'sip' | null;
  scheme: SchemeDetail | null;
  onClose: () => void;
}) {
  const t = useTheme();
  const { accessToken } = useSession();
  const [amount, setAmount] = useState('');
  const [date, setDate]     = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode) {
      setAmount('');
      setDate(scheme?.systematic?.allowed_dates?.[0] ?? 5);
    }
  }, [mode, scheme]);

  if (!mode || !scheme) return null;

  const isSip = mode === 'sip';
  const min = isSip
    ? scheme.systematic?.min_amount ?? 500
    : scheme.lumpsum.purchase.min_amount;
  const mul = isSip
    ? scheme.systematic?.multiplier ?? 100
    : scheme.lumpsum.purchase.multiplier;
  const amountNum = Number(amount) || 0;
  const valid = amountNum >= min && (amountNum % mul === 0);

  const submit = async () => {
    if (!valid || !accessToken || !scheme.bse_code) return;
    setSubmitting(true);
    try {
      if (!isSip) {
        const res = await placeLumpsum(accessToken, {
          scheme_code: scheme.bse_code,
          scheme_name: scheme.name,
          isin: scheme.isin,
          amount: amountNum,
        });
        const link = await getPaymentLink(accessToken, res.order_id);
        onClose();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (link.auth_url) {
          await WebBrowser.openBrowserAsync(link.auth_url);
        } else {
          // BSE sometimes sends the auth link via email instead of returning
          // a URL here (typical for first-time orders + 2FA). Explain that
          // clearly so the user knows to check their inbox.
          Alert.alert(
            'Check your email to authorise',
            'Your lumpsum order has been placed. BSE has sent a payment authorisation link to your registered email — open it to complete the payment. You can also retry from My Orders → Pay now.',
          );
        }
      } else {
        const today = new Date();
        const startDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        const res = await placeSip(accessToken, {
          scheme_code: scheme.bse_code,
          scheme_name: scheme.name,
          isin: scheme.isin,
          amount: amountNum,
          frequency: scheme.systematic?.frequency || 'MONTHLY',
          start_date: startDate,
          txn_date: date ?? 5,
          installments: scheme.systematic?.min_installments || 60,
        });
        const link = await getSipAuthLink(accessToken, res.sip_id);
        onClose();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (link.auth_url) {
          await WebBrowser.openBrowserAsync(link.auth_url);
        } else {
          Alert.alert(
            'Check your email to authenticate',
            'Your SIP has been registered. BSE has sent the first-installment authentication link to your registered email. You can also retry from My SIPs → Authenticate.',
          );
        }
      }
    } catch (e) {
      Alert.alert('Order failed', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={!!mode}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={{
              backgroundColor: t.card,
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 20, paddingBottom: 36,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold" style={{ color: t.textPrimary }}>
                {isSip ? 'Start a SIP' : 'Invest lumpsum'}
              </Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <X size={18} color={t.textSecondary} />
              </Pressable>
            </View>

            <Text className="text-[12px] mb-1.5 ml-1" style={{ color: t.textSecondary }}>
              Amount (₹)
            </Text>
            <TextInput
              keyboardType="number-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder={`Min ₹${min.toLocaleString('en-IN')}`}
              placeholderTextColor={t.textSecondary}
              style={{
                backgroundColor: t.bg,
                borderColor: t.border, borderWidth: 1,
                borderRadius: 14,
                paddingHorizontal: 14, paddingVertical: 14,
                color: t.textPrimary, fontSize: 20, fontWeight: '700',
              }}
            />
            <Text className="text-[11px] mt-1.5 ml-1" style={{ color: t.textSecondary }}>
              Min ₹{min.toLocaleString('en-IN')} · multiples of ₹{mul.toLocaleString('en-IN')}
            </Text>

            {isSip && scheme.systematic ? (
              <>
                <Text className="text-[12px] mt-4 mb-2 ml-1" style={{ color: t.textSecondary }}>
                  SIP date
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {scheme.systematic.allowed_dates.slice(0, 10).map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => setDate(d)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: date === d ? t.brand : t.bg,
                        borderColor: date === d ? t.brand : t.border, borderWidth: 1,
                      }}
                    >
                      <Text style={{ color: date === d ? '#ffffff' : t.textPrimary, fontWeight: '600', fontSize: 12 }}>
                        {d}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <Pressable
              onPress={submit}
              disabled={!valid || submitting}
              style={{
                marginTop: 18,
                paddingVertical: 14, borderRadius: 14,
                backgroundColor: !valid || submitting ? t.border : (isSip ? '#0ea5e9' : t.brand),
                alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
              }}
            >
              {submitting ? <ActivityIndicator color="#ffffff" /> : (
                <>
                  {isSip ? <Repeat size={16} color="#ffffff" /> : <Wallet size={16} color="#ffffff" />}
                  <Text className="text-white font-semibold">
                    {isSip ? 'Register SIP' : 'Continue to pay'}
                  </Text>
                </>
              )}
            </Pressable>
            <Text className="text-[10px] text-center mt-3" style={{ color: t.textSecondary }}>
              You&apos;ll complete payment/authentication on BSE in your browser.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
