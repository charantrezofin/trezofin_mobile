import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, LogOut, Shield, Moon, Sun, Monitor, Globe, Volume2, Mail, Wallet, Repeat, RefreshCw, Fingerprint, ShieldCheck, UserCheck } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase/client';
import { getUserProfile, type UserProfile } from '../../lib/api/client';
import { useSession } from '../../lib/hooks/useSession';
import { useTheme, useThemePref, type ThemePref } from '../../lib/theme/ThemeProvider';
import { useBiometricLock } from '../../lib/hooks/useBiometricLock';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import { SARVAM_LANGUAGES, DEFAULT_LANGUAGE_CODE, getLanguageByCode } from '../../lib/constants/languages';
import { SARVAM_SPEAKERS, DEFAULT_SPEAKER_ID } from '../../lib/constants/speakers';

const LANG_KEY    = 'trezofin_voice_lang';
const SPEAKER_KEY = 'trezofin_voice_speaker';

export default function Profile() {
  const t = useTheme();
  const { pref, setPref } = useThemePref();
  const { accessToken } = useSession();
  const bio = useBiometricLock();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang]       = useState(DEFAULT_LANGUAGE_CODE);
  const [speaker, setSpeaker] = useState(DEFAULT_SPEAKER_ID);

  useEffect(() => {
    (async () => {
      const savedLang = await SecureStore.getItemAsync(LANG_KEY);
      if (savedLang) setLang(savedLang);
      const savedSpk = await SecureStore.getItemAsync(SPEAKER_KEY);
      if (savedSpk) setSpeaker(savedSpk);
    })();
  }, []);

  useEffect(() => {
    if (!accessToken) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const p = await getUserProfile(accessToken);
        if (!cancelled) setProfile(p);
      } catch (e) {
        console.warn('profile load failed:', (e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [accessToken]);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Investor';

  const pickLanguage = () => {
    Alert.alert(
      'Default voice language',
      'Which language should the voice assistant use by default?',
      [
        ...SARVAM_LANGUAGES.map((l) => ({
          text: `${l.nativeLabel} (${l.label})`,
          onPress: async () => {
            setLang(l.code);
            await SecureStore.setItemAsync(LANG_KEY, l.code);
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const pickSpeaker = () => {
    Alert.alert(
      'Default voice',
      'Which voice should the assistant use by default?',
      [
        ...SARVAM_SPEAKERS.map((s) => ({
          text: `${s.label} · ${s.gender} · ${s.tone}`,
          onPress: async () => {
            setSpeaker(s.id);
            await SecureStore.setItemAsync(SPEAKER_KEY, s.id);
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const signOut = async () => {
    Alert.alert('Sign out?', 'You will need to log in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => { await supabase.auth.signOut(); },
      },
    ]);
  };

  const langObj = getLanguageByCode(lang);
  const spkObj  = SARVAM_SPEAKERS.find((s) => s.id === speaker) ?? SARVAM_SPEAKERS[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text className="text-3xl font-bold mb-6" style={{ color: t.textPrimary }}>
          Profile
        </Text>

        {/* Hero user card */}
        <Card padding={20} style={{ marginBottom: 16 }}>
          {loading ? (
            <View className="flex-row items-center gap-4">
              <ActivityIndicator color={t.brand} />
              <Text style={{ color: t.textSecondary }}>Loading your profile…</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-4">
              <Avatar name={fullName} size={56} color={t.brand} />
              <View style={{ flex: 1 }}>
                <Text className="text-lg font-bold" style={{ color: t.textPrimary }}>
                  {fullName}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-0.5">
                  <Mail size={12} color={t.textSecondary} />
                  <Text className="text-[13px]" style={{ color: t.textSecondary }} numberOfLines={1}>
                    {profile?.email ?? '—'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Risk snapshot + retake */}
        <Card padding={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
          <View className="flex-row items-center px-5 pt-4 pb-2 gap-2">
            <Shield size={14} color={t.textSecondary} />
            <Text
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: t.textSecondary }}
            >
              Risk profile
            </Text>
          </View>
          <View className="px-5 pb-4 flex-row items-end justify-between">
            <Text className="text-2xl font-bold" style={{ color: t.textPrimary }}>
              {profile?.risk_category ?? 'Not assessed'}
            </Text>
            <Text className="text-base" style={{ color: t.textSecondary }}>
              {profile?.risk_score ?? '—'}
              <Text className="text-xs" style={{ color: t.textSecondary }}>/50</Text>
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/risk-assessment')}
            className="flex-row items-center justify-between px-5 py-3.5"
            style={{ borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.brand + '08' }}
          >
            <View className="flex-row items-center gap-2">
              <RefreshCw size={14} color={t.brand} />
              <Text className="text-[13px] font-semibold" style={{ color: t.brand }}>
                Retake assessment
              </Text>
            </View>
            <ChevronRight size={16} color={t.brand} />
          </Pressable>
        </Card>

        {/* Portfolio actions */}
        <Text
          className="text-[10px] font-bold uppercase tracking-widest mb-2 ml-1"
          style={{ color: t.textSecondary }}
        >
          Portfolio
        </Text>
        <Card padding={0} style={{ marginBottom: 24, overflow: 'hidden' }}>
          <SettingRow
            icon={<Wallet size={18} color={t.brand} />}
            title="My Orders"
            value="Lumpsum purchases & status"
            onPress={() => router.push('/orders')}
          />
          <Divider />
          <SettingRow
            icon={<Repeat size={18} color={t.brand} />}
            title="My SIPs"
            value="Active & pending SIPs"
            onPress={() => router.push('/sips')}
          />
          <Divider />
          <SettingRow
            icon={<ShieldCheck size={18} color={t.brand} />}
            title="Mandates"
            value="UPI & eNACH autopay"
            onPress={() => router.push('/mandates')}
          />
          <Divider />
          <SettingRow
            icon={<UserCheck size={18} color={t.brand} />}
            title="Onboarding (UCC / KYC)"
            value="PAN, bank, address, FATCA"
            onPress={() => router.push('/onboarding')}
          />
        </Card>

        <Text
          className="text-[10px] font-bold uppercase tracking-widest mb-2 ml-1"
          style={{ color: t.textSecondary }}
        >
          Preferences
        </Text>

        <Card padding={0} style={{ marginBottom: 24, overflow: 'hidden' }}>
          <SettingRow
            icon={<Globe size={18} color={t.brand} />}
            title="Default language"
            value={`${langObj.nativeLabel} · ${langObj.label}`}
            onPress={pickLanguage}
          />
          <Divider />
          <SettingRow
            icon={<Volume2 size={18} color={t.brand} />}
            title="Voice"
            value={`${spkObj.label} · ${spkObj.tone}`}
            onPress={pickSpeaker}
          />
          <Divider />
          <SettingRow
            icon={pref === 'dark' ? <Moon size={18} color={t.brand} /> : pref === 'light' ? <Sun size={18} color={t.brand} /> : <Monitor size={18} color={t.brand} />}
            title="Theme"
            value={pref === 'auto' ? `Auto · ${t.name === 'dark' ? 'Dark' : 'Light'} now` : pref === 'dark' ? 'Dark' : 'Light'}
            onPress={() => {
              Alert.alert('Theme', 'Choose how the app looks.', [
                { text: 'Auto (follow system)', onPress: () => setPref('auto' as ThemePref) },
                { text: 'Light',                onPress: () => setPref('light' as ThemePref) },
                { text: 'Dark',                 onPress: () => setPref('dark' as ThemePref) },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          />
          <Divider />
          <SettingRow
            icon={<Fingerprint size={18} color={t.brand} />}
            title="Biometric unlock"
            value={
              !bio.available
                ? 'Not available on this device'
                : bio.enabled ? 'On — required at launch' : 'Off'
            }
            onPress={async () => {
              if (!bio.available) {
                Alert.alert('Not available', 'Set up Face ID / fingerprint in your device settings first.');
                return;
              }
              const ok = await bio.setEnabled(!bio.enabled);
              if (!ok) Alert.alert('Authentication failed', 'Biometric was not confirmed.');
            }}
          />
        </Card>

        <Pressable
          onPress={signOut}
          className="rounded-2xl px-5 py-4 flex-row items-center justify-center gap-2"
          style={{
            backgroundColor: t.card,
            borderColor: '#ef4444',
            borderWidth: 1,
          }}
        >
          <LogOut size={16} color="#ef4444" />
          <Text style={{ color: '#ef4444' }} className="font-semibold">Sign out</Text>
        </Pressable>

        <Text
          className="text-[11px] text-center mt-6"
          style={{ color: t.textSecondary }}
        >
          Trezofin AI · v0.1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon, title, value, onPress, chevron = true,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  onPress?: () => void;
  chevron?: boolean;
}) {
  const t = useTheme();
  const Content = (
    <View className="flex-row items-center px-5 py-4 gap-3">
      <View
        className="w-8 h-8 rounded-xl items-center justify-center"
        style={{ backgroundColor: t.brand + '1A' /* 10% alpha */ }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text className="text-[15px] font-semibold" style={{ color: t.textPrimary }}>
          {title}
        </Text>
        <Text className="text-[12px] mt-0.5" style={{ color: t.textSecondary }} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {chevron && <ChevronRight size={18} color={t.textSecondary} />}
    </View>
  );
  if (!onPress) return Content;
  return (
    <Pressable onPress={onPress} android_ripple={{ color: t.border }}>
      {Content}
    </Pressable>
  );
}

function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.border, marginLeft: 64 }} />;
}
