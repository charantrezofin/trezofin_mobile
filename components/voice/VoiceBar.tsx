/**
 * VoiceBar — mobile version of the web voice-first hero component.
 *
 * THIS IS A PLACEHOLDER that renders the static card shell only.
 * The full implementation (mic capture via expo-audio, STT → chat →
 * TTS pipeline, reactive waveform via Reanimated, phase-aware border,
 * rotating thinking ring, speaker picker) will be built out in the
 * next commit once the scaffold runs on device.
 */
import { View, Text, Pressable } from 'react-native';
import { Mic } from 'lucide-react-native';
import { useTheme } from '../../lib/theme/ThemeProvider';

export default function VoiceBar() {
  const t = useTheme();
  return (
    <View
      className="w-full rounded-3xl overflow-hidden"
      style={{
        backgroundColor: t.voiceCard,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 10,
      }}
    >
      <View className="px-6 pt-10 pb-6 items-center">
        <Text
          className="text-xs font-bold uppercase tracking-widest mb-4"
          style={{ color: t.textOnVoiceMuted }}
        >
          Voice Assistant
        </Text>

        <Pressable
          className="w-20 h-20 rounded-full items-center justify-center"
          style={{
            backgroundColor: t.brand,
            shadowColor: t.brand,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Mic color="#ffffff" size={28} />
        </Pressable>

        <Text
          className="text-sm mt-4 text-center"
          style={{ color: t.textOnVoiceMuted }}
        >
          Tap the mic — coming alive in the next commit
        </Text>
      </View>
    </View>
  );
}
