/**
 * UCC onboarding — condensed 4-step form that collects the minimum BSE
 * requires to register a Unique Client Code and activate a user for
 * order placement. Once submitted + 2FA-authorised the user's status
 * goes from 'pending' -> 'ucc_submitted' -> 'active'.
 *
 * Steps:
 *   1. Personal    (PAN, DOB, gender, occupation)
 *   2. Bank        (account type, account number, IFSC, bank name)
 *   3. Address     (line 1, pincode, city, state)
 *   4. FATCA       (place of birth, wealth source, income slab, PEP)
 * Then review + Submit → 2FA link.
 *
 * Nomination is intentionally skipped for v1 — we save
 * `nomination_opted: false` so BSE accepts the submission. Nomination
 * can be completed separately on the web app.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react-native';
import ScreenHeader from '../components/ui/ScreenHeader';
import Card from '../components/ui/Card';
import { useSession } from '../lib/hooks/useSession';
import { useTheme } from '../lib/theme/ThemeProvider';
import {
  getProfileFull,
  updateProfile,
  submitUcc,
  getUccAuthLink,
  type ProfileFull,
  type ProfileUpdate,
} from '../lib/api/profile';

type Step = 0 | 1 | 2 | 3 | 4;
const TITLES = ['Personal', 'Bank', 'Address', 'FATCA', 'Review'];

const OCCUPATIONS = [
  { code: '01', label: 'Private sector' },
  { code: '02', label: 'Public sector' },
  { code: '03', label: 'Business' },
  { code: '04', label: 'Professional' },
  { code: '05', label: 'Retired' },
  { code: '06', label: 'Housewife' },
  { code: '07', label: 'Student' },
  { code: '08', label: 'Others' },
];
const INCOME_SLABS = [
  { code: '31', label: 'Below ₹1L' },
  { code: '32', label: '₹1L – ₹5L' },
  { code: '33', label: '₹5L – ₹10L' },
  { code: '34', label: '₹10L – ₹25L' },
  { code: '35', label: '₹25L – ₹1Cr' },
  { code: '36', label: 'Above ₹1Cr' },
];
const WEALTH_SOURCES = [
  { code: '01', label: 'Salary' },
  { code: '02', label: 'Business income' },
  { code: '03', label: 'Gift' },
  { code: '04', label: 'Ancestral property' },
  { code: '05', label: 'Rental income' },
  { code: '06', label: 'Prize money' },
  { code: '07', label: 'Royalty' },
  { code: '08', label: 'Others' },
];

export default function Onboarding() {
  const t = useTheme();
  const { accessToken } = useSession();
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<ProfileUpdate & { mobile?: string; email?: string }>({});

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const p = await getProfileFull(accessToken);
      setData({
        pan: p.pan ?? undefined,
        dob: p.dob ?? undefined,
        gender: (p.gender as 'M' | 'F') ?? undefined,
        occupation_code: p.occupation_code ?? undefined,
        bank_acc_type: (p.bank_acc_type as 'SB' | 'CB') ?? undefined,
        bank_acc_num: p.bank_acc_num ?? undefined,
        ifsc_code: p.ifsc_code ?? undefined,
        bank_name: p.bank_name ?? undefined,
        address_line_1: p.address_line_1 ?? undefined,
        pincode: p.pincode ?? undefined,
        city: p.city ?? undefined,
        state: p.state ?? undefined,
        place_of_birth: p.place_of_birth ?? undefined,
        wealth_source: p.wealth_source ?? undefined,
        income_slab: p.income_slab ?? undefined,
        pep_status: (p.pep_status as 'Y' | 'N' | 'R') ?? 'N',
      });
    } catch (e) {
      console.warn('profile load', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);
  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof ProfileUpdate>(k: K, v: ProfileUpdate[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const stepValid = useMemo(() => {
    switch (step) {
      case 0: return !!(data.pan?.match(/^[A-Z]{5}[0-9]{4}[A-Z]$/i))
                  && !!data.dob && !!data.gender && !!data.occupation_code;
      case 1: return !!data.bank_acc_type && !!data.bank_acc_num
                  && !!data.ifsc_code && !!data.bank_name;
      case 2: return !!data.address_line_1 && !!data.pincode
                  && !!data.city && !!data.state;
      case 3: return !!data.place_of_birth && !!data.wealth_source
                  && !!data.income_slab && !!data.pep_status;
      default: return true;
    }
  }, [step, data]);

  const saveAndNext = async () => {
    if (!accessToken || !stepValid) return;
    setSaving(true);
    try {
      await updateProfile(accessToken, {
        ...data,
        pan: data.pan?.toUpperCase(),
        ifsc_code: data.ifsc_code?.toUpperCase(),
        nomination_opted: false,
      });
      setStep((s) => (Math.min(s + 1, 4) as Step));
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const finishSubmit = async () => {
    if (!accessToken) return;
    setSubmitting(true);
    try {
      const r = await submitUcc(accessToken);
      if (!r.success) throw new Error(r.message || 'UCC submission failed');
      const link = await getUccAuthLink(accessToken);
      if (link.auth_url) {
        await WebBrowser.openBrowserAsync(link.auth_url);
        Alert.alert(
          'Almost there',
          'Complete the 2FA step in the browser. Your account activates automatically after that.',
        );
      } else {
        Alert.alert('Submitted', link.message || 'Check your email for the 2FA link.');
      }
      router.back();
    } catch (e) {
      Alert.alert('Submission failed', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <ScreenHeader title="Complete your onboarding" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.brand} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title="Complete onboarding"
        subtitle={`Step ${step + 1} of 5 · ${TITLES[step]}`}
      />

      {/* Progress bar */}
      <View className="px-5 pb-2">
        <View style={{ height: 4, borderRadius: 2, backgroundColor: t.border, overflow: 'hidden' }}>
          <View
            style={{
              width: `${((step + 1) / 5) * 100}%`,
              height: '100%',
              backgroundColor: t.brand,
            }}
          />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          {step === 0 && (
            <Card padding={18}>
              <Field label="PAN" value={data.pan} onChange={(v) => set('pan', v.toUpperCase())}
                placeholder="ABCDE1234F" autoCapitalize="characters" maxLength={10} />
              <Field label="Date of birth" value={data.dob} onChange={(v) => set('dob', v)}
                placeholder="YYYY-MM-DD" />
              <Choice label="Gender" value={data.gender ?? null}
                options={[{ code: 'M', label: 'Male' }, { code: 'F', label: 'Female' }]}
                onSelect={(c) => set('gender', c as 'M' | 'F')} />
              <ChoiceList label="Occupation" value={data.occupation_code ?? null}
                options={OCCUPATIONS} onSelect={(c) => set('occupation_code', c)} />
            </Card>
          )}

          {step === 1 && (
            <Card padding={18}>
              <Choice label="Account type" value={data.bank_acc_type ?? null}
                options={[{ code: 'SB', label: 'Savings' }, { code: 'CB', label: 'Current' }]}
                onSelect={(c) => set('bank_acc_type', c as 'SB' | 'CB')} />
              <Field label="Account number" value={data.bank_acc_num} onChange={(v) => set('bank_acc_num', v)}
                keyboardType="number-pad" />
              <Field label="IFSC" value={data.ifsc_code} onChange={(v) => set('ifsc_code', v.toUpperCase())}
                placeholder="HDFC0001234" autoCapitalize="characters" maxLength={11} />
              <Field label="Bank name" value={data.bank_name} onChange={(v) => set('bank_name', v)}
                placeholder="HDFC Bank" />
            </Card>
          )}

          {step === 2 && (
            <Card padding={18}>
              <Field label="Address line 1" value={data.address_line_1} onChange={(v) => set('address_line_1', v)} />
              <Field label="Pincode" value={data.pincode} onChange={(v) => set('pincode', v)}
                keyboardType="number-pad" maxLength={6} />
              <Field label="City" value={data.city} onChange={(v) => set('city', v)} />
              <Field label="State" value={data.state} onChange={(v) => set('state', v)} />
            </Card>
          )}

          {step === 3 && (
            <Card padding={18}>
              <Field label="Place of birth" value={data.place_of_birth} onChange={(v) => set('place_of_birth', v)} />
              <ChoiceList label="Source of wealth" value={data.wealth_source ?? null}
                options={WEALTH_SOURCES} onSelect={(c) => set('wealth_source', c)} />
              <ChoiceList label="Annual income" value={data.income_slab ?? null}
                options={INCOME_SLABS} onSelect={(c) => set('income_slab', c)} />
              <Choice label="Politically exposed?" value={data.pep_status ?? 'N'}
                options={[
                  { code: 'N', label: 'No' },
                  { code: 'Y', label: 'Yes' },
                  { code: 'R', label: 'Related' },
                ]}
                onSelect={(c) => set('pep_status', c as 'Y' | 'N' | 'R')} />
            </Card>
          )}

          {step === 4 && (
            <Card padding={18}>
              <Text className="text-base font-bold mb-3" style={{ color: t.textPrimary }}>
                Review & submit
              </Text>
              <Row k="PAN"         v={data.pan} />
              <Row k="DOB"         v={data.dob} />
              <Row k="Gender"      v={data.gender === 'M' ? 'Male' : data.gender === 'F' ? 'Female' : undefined} />
              <Row k="Occupation"  v={OCCUPATIONS.find((o) => o.code === data.occupation_code)?.label} />
              <Row k="Bank"        v={data.bank_name} />
              <Row k="A/C"         v={data.bank_acc_num ? `•• ${String(data.bank_acc_num).slice(-4)}` : undefined} />
              <Row k="IFSC"        v={data.ifsc_code} />
              <Row k="Address"     v={data.address_line_1} />
              <Row k="Pincode"     v={data.pincode} />
              <Row k="City / State" v={[data.city, data.state].filter(Boolean).join(', ')} />
              <Row k="Income"      v={INCOME_SLABS.find((o) => o.code === data.income_slab)?.label} />
              <Row k="Source"      v={WEALTH_SOURCES.find((o) => o.code === data.wealth_source)?.label} />
              <Row k="PEP"         v={data.pep_status === 'Y' ? 'Yes' : data.pep_status === 'R' ? 'Related' : 'No'} />
              <Text className="text-[11px] mt-3" style={{ color: t.textSecondary }}>
                Nomination can be added later from the web app (Profile → Nomination).
              </Text>
            </Card>
          )}
        </ScrollView>

        {/* Nav bar */}
        <View
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28,
            backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border,
          }}
        >
          {step > 0 && (
            <Pressable
              onPress={() => setStep((s) => (Math.max(0, s - 1) as Step))}
              style={{
                paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14,
                backgroundColor: t.bg, borderWidth: 1, borderColor: t.border,
                flexDirection: 'row', alignItems: 'center', gap: 4,
              }}
            >
              <ChevronLeft size={16} color={t.textPrimary} />
              <Text style={{ color: t.textPrimary, fontWeight: '600' }}>Back</Text>
            </Pressable>
          )}
          {step < 4 ? (
            <Pressable
              onPress={saveAndNext}
              disabled={!stepValid || saving}
              style={{
                flex: 1,
                paddingVertical: 14, borderRadius: 14,
                backgroundColor: !stepValid || saving ? t.border : t.brand,
                alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
              }}
            >
              {saving ? <ActivityIndicator color="#ffffff" /> : (
                <>
                  <Text className="text-white font-semibold">Save & continue</Text>
                  <ChevronRight size={16} color="#ffffff" />
                </>
              )}
            </Pressable>
          ) : (
            <Pressable
              onPress={finishSubmit}
              disabled={submitting}
              style={{
                flex: 1,
                paddingVertical: 14, borderRadius: 14,
                backgroundColor: submitting ? t.border : t.brand,
                alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
              }}
            >
              {submitting ? <ActivityIndicator color="#ffffff" /> : (
                <>
                  <CheckCircle2 size={16} color="#ffffff" />
                  <Text className="text-white font-semibold">Submit to BSE</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  label, value, onChange, placeholder, keyboardType, autoCapitalize, maxLength,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  autoCapitalize?: 'none' | 'characters';
  maxLength?: number;
}) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text className="text-[11px] font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: t.textSecondary }}>
        {label}
      </Text>
      <TextInput
        value={value ?? ''}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.textSecondary}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        maxLength={maxLength}
        style={{
          backgroundColor: t.bg, color: t.textPrimary,
          borderColor: t.border, borderWidth: 1, borderRadius: 12,
          paddingHorizontal: 12, paddingVertical: 12, fontSize: 14,
        }}
      />
    </View>
  );
}

function Choice({
  label, value, options, onSelect,
}: {
  label: string;
  value: string | null;
  options: { code: string; label: string }[];
  onSelect: (c: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text className="text-[11px] font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: t.textSecondary }}>
        {label}
      </Text>
      <View className="flex-row gap-2">
        {options.map((o) => {
          const active = value === o.code;
          return (
            <Pressable
              key={o.code}
              onPress={() => onSelect(o.code)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 12,
                backgroundColor: active ? t.brand : t.bg,
                borderColor: active ? t.brand : t.border, borderWidth: 1,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: active ? '#ffffff' : t.textPrimary, fontWeight: '600', fontSize: 13 }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ChoiceList({
  label, value, options, onSelect,
}: {
  label: string;
  value: string | null;
  options: { code: string; label: string }[];
  onSelect: (c: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text className="text-[11px] font-bold uppercase tracking-widest mb-1.5 ml-1" style={{ color: t.textSecondary }}>
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.code;
          return (
            <Pressable
              key={o.code}
              onPress={() => onSelect(o.code)}
              style={{
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
                backgroundColor: active ? t.brand : t.bg,
                borderColor: active ? t.brand : t.border, borderWidth: 1,
              }}
            >
              <Text style={{ color: active ? '#ffffff' : t.textPrimary, fontSize: 12, fontWeight: '600' }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  const t = useTheme();
  return (
    <View className="flex-row justify-between py-2 border-b" style={{ borderBottomColor: t.border }}>
      <Text className="text-[12px]" style={{ color: t.textSecondary }}>{k}</Text>
      <Text className="text-[13px] font-semibold" style={{ color: t.textPrimary, maxWidth: '60%' }} numberOfLines={1}>
        {v ?? '—'}
      </Text>
    </View>
  );
}
