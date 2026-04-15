/**
 * VoiceBar — hands-free conversational voice UI (mobile).
 *
 * Mirrors the web experience:
 *  - Tap mic → rolling session: listen → 2s silence ends turn → STT → chat
 *    (mode=voice) → TTS → playback → auto-resume listening.
 *  - Phase-aware card border colour (listening / thinking / speaking / idle).
 *  - Rotating gradient "thinking ring" around the card while the model works.
 *  - Reactive waveform driven by mic metering (dBFS → 0..1 normalised).
 *  - Language + Speaker selectors (Alert-based pickers for now).
 *  - Stop button tears everything down cleanly.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, Platform, AppState } from 'react-native';
import { Mic, Square, Globe, Volume2, Loader2 } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
// Using the legacy FS API: the new File.write(base64, { encoding: 'base64' })
// throws FunctionCallException on iOS SDK 54. writeAsStringAsync works.
import * as LegacyFS from 'expo-file-system/legacy';
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  createAudioPlayer,
  type AudioPlayer,
} from 'expo-audio';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { useSession } from '../../lib/hooks/useSession';
import { API_BASE } from '../../lib/api/config';
import {
  transcribeAudio,
  sendChatMessage,
  speakText,
  getVoiceContext,
} from '../../lib/api/ai';
import {
  SARVAM_LANGUAGES,
  DEFAULT_LANGUAGE_CODE,
  getLanguageByCode,
} from '../../lib/constants/languages';
import {
  SARVAM_SPEAKERS,
  DEFAULT_SPEAKER_ID,
} from '../../lib/constants/speakers';

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';

const SILENCE_MS       = 2000;  // 2s silence = user stopped
const MIN_SPEECH_MS    =  400;  // require this much speech before arming silence
// Phone mics report dBFS roughly in [-80, 0]. Ambient indoor noise sits
// around -55…-45 dBFS; normal conversational speech at arm's length sits
// around -40…-25 dBFS. We pick -42 as the speech gate so we catch
// everyday talking without triggering on room noise, and -34 for
// barge-in so TTS playback doesn't mis-interrupt itself.
const DB_SPEECH        =  -46;  // tuned on real device: normal speech reads ~-44 dB at arm's length
const TICK_MS          =  120;  // metering poll interval
const LANG_KEY         = 'trezofin_voice_lang';
const SPEAKER_KEY      = 'trezofin_voice_speaker';

const BAR_COUNT = 21;

export default function VoiceBar() {
  const t = useTheme();
  const { accessToken } = useSession();

  // ── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase]              = useState<Phase>('idle');
  const [sessionActive, setSessionActive] = useState(false);
  const [errMsg, setErrMsg]            = useState<string | null>(null);
  const [lang, setLang]                = useState(DEFAULT_LANGUAGE_CODE);
  const [speaker, setSpeaker]          = useState(DEFAULT_SPEAKER_ID);
  const [liveDb, setLiveDb]            = useState<number | null>(null);   // shown in diagnostic bar
  const [spokeDetected, setSpokeDetected] = useState(false);              // flips true once we've seen >DB_SPEECH

  // Load persisted prefs
  useEffect(() => {
    (async () => {
      const l = await SecureStore.getItemAsync(LANG_KEY);
      if (l) setLang(l);
      const s = await SecureStore.getItemAsync(SPEAKER_KEY);
      if (s) setSpeaker(s);
    })();
  }, []);

  // ── Refs (session machinery — intentionally not state) ───────────────────
  const sessionActiveRef  = useRef(false);
  const phaseRef          = useRef<Phase>('idle');
  const langRef           = useRef(lang);
  const speakerRef        = useRef(speaker);
  const historyRef        = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const userContextRef    = useRef<string | null>(null);

  const meterTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechStartAtRef  = useRef<number | null>(null);
  const silenceStartAtRef = useRef<number | null>(null);
  const turnInFlightRef   = useRef(false);
  const currentPlayerRef  = useRef<AudioPlayer | null>(null);
  const abortCtrlRef      = useRef<AbortController | null>(null);
  const fallbackStreakRef = useRef(0);

  // Keep latest prefs / phase mirrored into refs
  useEffect(() => { langRef.current    = lang;    }, [lang]);
  useEffect(() => { speakerRef.current = speaker; }, [speaker]);
  useEffect(() => { phaseRef.current   = phase;   }, [phase]);

  // ── Recorder (expo-audio) ────────────────────────────────────────────────
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });

  // ── Reanimated: live mic level (0..1), phase-border colour, ring rotation
  const level  = useSharedValue(0);
  const rotate = useSharedValue(0);

  // Animated bars — each reacts to `level` with a per-bar phase so the
  // waveform feels wavy, not a solid rise/fall.
  const bars = useMemo(() => {
    const arr: Array<{ i: number; center: number }> = [];
    const half = Math.floor(BAR_COUNT / 2);
    for (let i = 0; i < BAR_COUNT; i++) {
      arr.push({ i, center: Math.abs(i - half) / half });
    }
    return arr;
  }, []);

  // Kick the thinking ring rotation when phase becomes "thinking"
  useEffect(() => {
    if (phase === 'thinking') {
      rotate.value = 0;
      rotate.value = withRepeat(
        withTiming(360, { duration: 1600, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(rotate);
      rotate.value = withTiming(0, { duration: 200 });
    }
  }, [phase, rotate]);

  // ── Accent colour per phase ──────────────────────────────────────────────
  const accent =
    phase === 'listening' ? { hex: '#f59e0b', ring: 'rgba(245,158,11,0.55)', soft: 'rgba(245,158,11,0.18)' }
      : phase === 'thinking'  ? { hex: '#38bdf8', ring: 'rgba(56,189,248,0.60)', soft: 'rgba(56,189,248,0.18)' }
      : phase === 'speaking'  ? { hex: '#10b981', ring: 'rgba(16,185,129,0.60)', soft: 'rgba(16,185,129,0.18)' }
      : { hex: t.voiceCardBorderIdle, ring: t.voiceCardBorderIdle, soft: 'rgba(255,255,255,0.04)' };

  // ── Turn processor ───────────────────────────────────────────────────────
  const processTurn = useCallback(async (uri: string, mimeType: string) => {
    if (!sessionActiveRef.current || !accessToken) return;
    turnInFlightRef.current = true;
    setPhase('thinking');

    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;
    const { signal } = ctrl;

    try {
      // STT
      console.log('[voice] STT → uri=', uri, 'mime=', mimeType);
      const stt = await transcribeAudio(accessToken, uri, mimeType, 'unknown', { signal });
      const userText = stt.transcribed_text?.trim();
      console.log('[voice] STT result:', userText, 'lang=', stt.detected_language);
      if (!userText || userText.length < 2) {
        setErrMsg("I didn't catch that — try speaking closer to the mic.");
        turnInFlightRef.current = false;
        if (sessionActiveRef.current) await startListening();
        return;
      }
      setErrMsg(null);
      const inputLang  = stt.detected_language && stt.detected_language !== 'unknown'
        ? stt.detected_language
        : langRef.current;
      const outputLang = langRef.current;

      // Chat
      if (!sessionActiveRef.current) return;
      console.log('[voice] /chat → in=', inputLang, 'out=', outputLang);
      const chat = await sendChatMessage(accessToken, userText, outputLang, {
        mode: 'voice',
        signal,
        inputLanguage: inputLang,
        outputLanguage: outputLang,
        history: historyRef.current,
        userContext: userContextRef.current,
      });
      const replyText = chat.response_text?.trim();
      console.log('[voice] chat reply:', replyText?.slice(0, 80));
      if (!replyText) {
        turnInFlightRef.current = false;
        if (sessionActiveRef.current) await startListening();
        return;
      }

      // Detect fallback streak to break the "Can you come again?" loop
      const isFallback = /^sorry, i (couldn't|could not) put that together/i.test(replyText);
      if (isFallback) {
        fallbackStreakRef.current += 1;
        if (fallbackStreakRef.current >= 2) {
          setErrMsg('Trouble understanding. Try rephrasing in a moment.');
          turnInFlightRef.current = false;
          if (sessionActiveRef.current) await startListening();
          return;
        }
      } else {
        fallbackStreakRef.current = 0;
        historyRef.current = [
          ...historyRef.current,
          { role: 'user' as const, content: userText },
          { role: 'assistant' as const, content: replyText },
        ].slice(-12);
      }

      // TTS
      if (!sessionActiveRef.current) return;
      console.log('[voice] /speak → speaker=', speakerRef.current, 'chars=', replyText.length);
      const tts = await speakText(accessToken, replyText, outputLang, {
        signal,
        speaker: speakerRef.current,
      });

      if (!sessionActiveRef.current) return;

      // Write base64 → cache file, then play via expo-audio.
      // Each turn uses a fresh filename to defeat expo-audio's source cache.
      const cacheDir = LegacyFS.cacheDirectory ?? LegacyFS.documentDirectory;
      if (!cacheDir) throw new Error('No cache directory available');
      const fileUri = `${cacheDir}tara-tts-${Date.now()}.wav`;
      await LegacyFS.writeAsStringAsync(fileUri, tts.audio_base64, {
        encoding: LegacyFS.EncodingType.Base64,
      });

      // Re-arm the recorder during TTS playback so the meter loop can
      // detect barge-in (user starts speaking while Tara is talking).
      // We discard the resulting file — only metering matters here.
      try {
        if (!recorder.isRecording) {
          await recorder.prepareToRecordAsync({
            ...RecordingPresets.HIGH_QUALITY,
            isMeteringEnabled: true,
          });
          recorder.record();
        }
      } catch { /* metering is best-effort during speaking */ }

      // Tear down any prior player
      try { currentPlayerRef.current?.remove(); } catch { /* ignore */ }

      const player = createAudioPlayer({ uri: fileUri });
      currentPlayerRef.current = player;

      setPhase('speaking');
      if (Platform.OS !== 'web') {
        try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
      }

      player.play();

      const waitForEnd = new Promise<void>((resolve) => {
        const sub = player.addListener('playbackStatusUpdate', (s) => {
          if (s.didJustFinish) { sub.remove(); resolve(); }
        });
      });
      await Promise.race([
        waitForEnd,
        new Promise((r) => setTimeout(r, 25000)), // safety cap
      ]);

      try { player.remove(); } catch { /* ignore */ }
      if (currentPlayerRef.current === player) currentPlayerRef.current = null;

      turnInFlightRef.current = false;
      if (sessionActiveRef.current) await startListening();
    } catch (e) {
      const err = e as Error;
      if (err.name !== 'AbortError') {
        // Surface concrete guidance. "Network request failed" on a phone
        // almost always means the phone can't reach the dev Mac on LAN.
        const msg = /network request failed|failed to fetch/i.test(err.message)
          ? `Can't reach backend at ${API_BASE}. On a phone, localhost points to the phone itself — set EXPO_PUBLIC_API_URL to your Mac's LAN IP in .env and reload.`
          : err.message;
        console.warn('voice turn failed:', err.message, 'API_BASE=', API_BASE);
        setErrMsg(msg);
      }
      turnInFlightRef.current = false;
      if (sessionActiveRef.current) await startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Barge-in: while Tara is speaking, the phone picks up its own
  // speaker output on the mic. We need a threshold well ABOVE that
  // echo or the assistant interrupts itself. -25 dBFS with a 400ms
  // hold is a tight test — only real directed voice trips it.
  const DB_BARGE = -25;
  const bargeStartAtRef = useRef<number | null>(null);

  /**
   * Cleanly stop TTS playback and pivot back to listening — used both for
   * barge-in (user interrupted) and for the explicit Stop button.
   */
  const interruptTts = useCallback(async () => {
    try { abortCtrlRef.current?.abort(); } catch {}
    try {
      const p = currentPlayerRef.current;
      if (p) { p.pause(); p.remove(); }
    } catch {}
    currentPlayerRef.current = null;
    turnInFlightRef.current = false;
    if (sessionActiveRef.current) await startListening();
  }, []);

  // ── Silence-detection + barge-in ticker ──────────────────────────────────
  // We sample dBFS every TICK_MS, and re-render the diagnostic readout at
  // ~4 Hz so the UI stays responsive without thrashing React.
  const lastUiRef = useRef(0);
  const startMeterLoop = useCallback(() => {
    if (meterTimerRef.current) clearInterval(meterTimerRef.current);
    meterTimerRef.current = setInterval(async () => {
      if (!sessionActiveRef.current) return;

      const status = recorder.getStatus();
      const db = status?.metering ?? -80;      // dBFS, typically -80..0
      // Wider range for the waveform so it actually moves at normal
      // conversational volume on a phone mic (roughly -45..-20 dBFS).
      const norm = Math.max(0, Math.min(1, (db + 70) / 60));
      level.value = withTiming(norm, { duration: TICK_MS });

      // Throttle diagnostic UI updates to ~4Hz
      const nowTs = Date.now();
      if (nowTs - lastUiRef.current > 240) {
        lastUiRef.current = nowTs;
        setLiveDb(Number.isFinite(db) ? Math.round(db) : null);
      }

      // Barge-in: while Tara is speaking, watch for user voice and pivot
      // back to listening if they start talking. Requires ~250ms of
      // sustained voice so we don't false-trigger on a cough.
      if (phaseRef.current === 'speaking') {
        const now = Date.now();
        if (db > DB_BARGE) {
          if (bargeStartAtRef.current == null) bargeStartAtRef.current = now;
          if (now - bargeStartAtRef.current >= 400) {
            bargeStartAtRef.current = null;
            console.log('[voice] barge-in detected at', db, 'dB');
            await interruptTts();
          }
        } else {
          bargeStartAtRef.current = null;
        }
        return;
      }

      // Don't run silence-detection while a turn is in flight (we're
      // mid-STT/chat/TTS) or when we're not actively listening.
      if (turnInFlightRef.current) return;
      if (phaseRef.current !== 'listening') return;

      const now = Date.now();
      if (db > DB_SPEECH) {
        if (speechStartAtRef.current == null) {
          speechStartAtRef.current = now;
          setSpokeDetected(true);   // show the user we heard them
        }
        silenceStartAtRef.current = null;
      } else if (speechStartAtRef.current != null) {
        if (silenceStartAtRef.current == null) silenceStartAtRef.current = now;
        const silentFor = now - silenceStartAtRef.current;
        const spokeFor  = silenceStartAtRef.current - speechStartAtRef.current;
        if (spokeFor >= MIN_SPEECH_MS && silentFor >= SILENCE_MS) {
          console.log('[voice] auto-finalise — spokeFor', spokeFor, 'silentFor', silentFor);
          await finaliseChunk();
        }
      }
    }, TICK_MS);
  }, [recorder, level, interruptTts]);

  const stopMeterLoop = () => {
    if (meterTimerRef.current) {
      clearInterval(meterTimerRef.current);
      meterTimerRef.current = null;
    }
  };

  // ── Recording lifecycle ──────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (!sessionActiveRef.current) return;
    try {
      speechStartAtRef.current = null;
      silenceStartAtRef.current = null;
      setSpokeDetected(false);
      await recorder.prepareToRecordAsync({
        ...RecordingPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      recorder.record();
      setPhase('listening');
      console.log('[voice] listening started, API_BASE=', API_BASE);
      startMeterLoop();
    } catch (e) {
      console.warn('[voice] startListening failed:', (e as Error).message);
      setErrMsg(`Couldn't start the mic: ${(e as Error).message}`);
    }
  }, [recorder, startMeterLoop]);

  const finaliseChunk = useCallback(async () => {
    if (!recorder.isRecording) return;
    stopMeterLoop();
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        if (sessionActiveRef.current) await startListening();
        return;
      }
      // expo-audio HIGH_QUALITY on iOS/Android is .m4a
      await processTurn(uri, 'audio/m4a');
    } catch (e) {
      console.warn('finaliseChunk failed:', (e as Error).message);
      if (sessionActiveRef.current) await startListening();
    }
  }, [recorder, processTurn, startListening]);

  // ── Session start / stop ─────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    if (sessionActive) return;
    setErrMsg(null);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setErrMsg('Microphone permission is required for voice.');
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldPlayInBackground: false,
      });

      sessionActiveRef.current = true;
      setSessionActive(true);
      fallbackStreakRef.current = 0;

      // Best-effort per-user context (risk profile + recommended picks)
      (async () => {
        if (!accessToken) return;
        try {
          const ctx = await getVoiceContext(accessToken);
          if (sessionActiveRef.current && ctx?.context_block) {
            userContextRef.current = ctx.context_block;
          }
        } catch { /* ignore */ }
      })();

      if (Platform.OS !== 'web') {
        try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
      }
      await startListening();
    } catch (e) {
      setErrMsg((e as Error).message ?? 'Could not start voice');
      await teardown();
    }
  }, [sessionActive, accessToken, startListening]);

  const teardown = useCallback(async () => {
    sessionActiveRef.current = false;
    turnInFlightRef.current = false;
    stopMeterLoop();
    try { abortCtrlRef.current?.abort(); } catch {}
    abortCtrlRef.current = null;

    try {
      if (recorder.isRecording) await recorder.stop();
    } catch {}

    try { currentPlayerRef.current?.pause(); currentPlayerRef.current?.remove(); } catch {}
    currentPlayerRef.current = null;

    historyRef.current = [];
    userContextRef.current = null;
    fallbackStreakRef.current = 0;

    level.value = withTiming(0, { duration: 200 });
    setPhase('idle');
    setSessionActive(false);
    setLiveDb(null);
    setSpokeDetected(false);
    setErrMsg(null);
  }, [recorder, level]);

  // Stop on unmount
  useEffect(() => {
    return () => { teardown(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Audio-session restoration — when the app comes back from background
  // (e.g. after a phone call interrupted us), re-arm the recorder if a
  // session is supposed to be active but the recorder fell over.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      if (!sessionActiveRef.current) return;
      if (turnInFlightRef.current) return;
      // If we're still in 'listening' but the recorder isn't actually
      // recording (iOS can suspend it), restart it cleanly.
      if (phaseRef.current === 'listening' && !recorder.isRecording) {
        try {
          await setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: true,
            shouldPlayInBackground: false,
          });
          await startListening();
        } catch { /* ignore */ }
      }
    });
    return () => sub.remove();
  }, [recorder, startListening]);

  // ── Pickers ──────────────────────────────────────────────────────────────
  const pickLanguage = () => {
    Alert.alert('Voice language', 'Reply in:', [
      ...SARVAM_LANGUAGES.map((l) => ({
        text: `${l.nativeLabel} (${l.label})`,
        onPress: async () => {
          setLang(l.code);
          await SecureStore.setItemAsync(LANG_KEY, l.code);
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };
  const pickSpeaker = () => {
    Alert.alert('Voice', 'Pick a voice:', [
      ...SARVAM_SPEAKERS.map((s) => ({
        text: `${s.label} · ${s.gender} · ${s.tone}`,
        onPress: async () => {
          setSpeaker(s.id);
          await SecureStore.setItemAsync(SPEAKER_KEY, s.id);
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const langObj = getLanguageByCode(lang);
  const spkObj  = SARVAM_SPEAKERS.find((s) => s.id === speaker) ?? SARVAM_SPEAKERS[0];
  const statusLabel =
    phase === 'listening' ? 'Listening'
      : phase === 'thinking' ? 'Thinking'
      : phase === 'speaking' ? 'Speaking'
      : '';

  // Rotating ring style
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return (
    <View>
      <View
        style={{
          borderRadius: 24,
          padding: 1.5,
          backgroundColor: accent.ring,
          shadowColor: accent.hex,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: sessionActive ? 0.35 : 0.15,
          shadowRadius: 18,
          elevation: 8,
        }}
      >
        {/* Thinking ring */}
        {phase === 'thinking' && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: -8, left: -8, right: -8, bottom: -8,
                borderRadius: 28,
                borderWidth: 2,
                borderColor: 'transparent',
                borderTopColor: accent.hex,
                borderRightColor: accent.hex + '55',
              },
              ringStyle,
            ]}
          />
        )}

        <View
          style={{
            backgroundColor: t.voiceCard,
            borderRadius: 22,
            padding: 18,
          }}
        >
          {/* Top row: status + pickers */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View
                style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: sessionActive ? accent.hex : 'rgba(255,255,255,0.25)',
                }}
              />
              <Text
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: t.textOnVoiceMuted }}
              >
                {sessionActive ? (statusLabel || 'Active') : 'Voice Assistant'}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Pressable
                onPress={pickLanguage}
                disabled={phase === 'thinking'}
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
              >
                <Globe size={12} color={t.textOnVoiceMuted} />
                <Text className="text-[11px] font-semibold" style={{ color: t.textOnVoice }}>
                  {langObj.nativeLabel}
                </Text>
              </Pressable>
              <Pressable
                onPress={pickSpeaker}
                disabled={phase === 'thinking' || phase === 'speaking'}
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
              >
                <Volume2 size={12} color={t.textOnVoiceMuted} />
                <Text className="text-[11px] font-semibold" style={{ color: t.textOnVoice }}>
                  {spkObj.label}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Waveform + controls */}
          <View className="flex-row items-center gap-4">
            {/* Bars */}
            <View
              style={{
                flex: 1, height: 52,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
              }}
            >
              {bars.map(({ i, center }) => (
                <Bar
                  key={i}
                  i={i}
                  center={center}
                  level={level}
                  active={sessionActive}
                  color={i < BAR_COUNT / 2 ? '#00d09c' : (sessionActive ? accent.hex : '#7c3aed')}
                />
              ))}
            </View>

            {/* Mic / Stop */}
            {!sessionActive ? (
              <Pressable
                onPress={startSession}
                style={{
                  width: 58, height: 58, borderRadius: 29,
                  backgroundColor: t.brand,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: t.brand, shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
                }}
              >
                <Mic size={22} color="#ffffff" />
              </Pressable>
            ) : (
              <View className="flex-row items-center gap-2">
                <View
                  style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: accent.hex,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {phase === 'thinking' ? (
                    <Loader2 size={18} color="#ffffff" />
                  ) : (
                    <Mic size={18} color="#ffffff" />
                  )}
                </View>
                <Pressable
                  onPress={teardown}
                  style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: '#ef4444',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Square size={16} color="#ffffff" fill="#ffffff" />
                </Pressable>
              </View>
            )}
          </View>

          {/* Diagnostic + manual Send (only while listening) */}
          {phase === 'listening' && (
            <View className="flex-row items-center justify-between mt-3 gap-3">
              <View className="flex-row items-center gap-2" style={{ flex: 1 }}>
                <View
                  style={{
                    width: 7, height: 7, borderRadius: 4,
                    backgroundColor: spokeDetected ? '#10b981' : t.textOnVoiceMuted,
                  }}
                />
                <Text style={{ color: t.textOnVoiceMuted, fontSize: 11 }}>
                  {spokeDetected ? 'Heard you' : 'Waiting for you to speak'}
                  {liveDb != null ? ` · ${liveDb} dB` : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => finaliseChunk()}
                className="px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: spokeDetected ? t.brand : 'rgba(255,255,255,0.12)',
                }}
              >
                <Text
                  style={{
                    color: spokeDetected ? '#ffffff' : t.textOnVoiceMuted,
                    fontSize: 11, fontWeight: '700',
                  }}
                >
                  Send now
                </Text>
              </Pressable>
            </View>
          )}

          {/* Hint / error */}
          <Text
            className="text-[11px] mt-2 text-center"
            style={{
              color: errMsg ? '#fca5a5' :
                     sessionActive ? accent.hex : t.textOnVoiceMuted,
            }}
            numberOfLines={2}
          >
            {errMsg
              ? errMsg
              : !sessionActive
                ? `Tap the mic · Speak in ${langObj.label}`
                : phase === 'listening' ? 'Speak naturally — I\'ll reply after a short pause'
                : phase === 'thinking'  ? 'Thinking of a quick answer…'
                : phase === 'speaking'  ? 'Speaking…'
                : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Bar({
  i, center, level, active, color,
}: {
  i: number;
  center: number;
  level: SharedValue<number>;
  active: boolean;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const envelope = 1 - center * 0.7;
    const tPulse = Math.sin((Date.now() / 500) + i * 0.4) * 0.15;
    const base = active ? 0.12 : 0.08;
    const scale = Math.max(0, Math.min(1, base + level.value * envelope + tPulse * envelope));
    return {
      height: 6 + scale * 40,
      opacity: active ? 0.95 : 0.6,
    };
  });
  return (
    <Animated.View
      style={[
        { width: 4, borderRadius: 2, backgroundColor: color },
        style,
      ]}
    />
  );
}
