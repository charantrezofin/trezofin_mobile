import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Bot, User, Globe, Sparkles } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { sendChatMessage } from '../../lib/api/ai';
import { useSession } from '../../lib/hooks/useSession';
import {
  SARVAM_LANGUAGES,
  DEFAULT_LANGUAGE_CODE,
  getLanguageByCode,
} from '../../lib/constants/languages';

type Msg = { id: string; role: 'user' | 'assistant'; text: string; at: Date };

const SUGGESTIONS = [
  'What is SIP?',
  'Which fund should I start with?',
  'Difference between equity and debt funds?',
  'What is ELSS?',
];

export default function Chat() {
  const t = useTheme();
  const { accessToken } = useSession();
  const [lang, setLang] = useState<string>(DEFAULT_LANGUAGE_CODE);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const listRef = useRef<FlatList>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  useEffect(() => { scrollToEnd(); }, [msgs, scrollToEnd]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending || !accessToken) return;
    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: content,
      at: new Date(),
    };
    setMsgs((m) => [...m, userMsg]);
    setInput('');
    setSending(true);
    try {
      const res = await sendChatMessage(accessToken, content, lang, {
        mode: 'chat',
        outputLanguage: lang,
        history: msgs
          .slice(-10)
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text })),
      });
      setMsgs((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: 'assistant', text: res.response_text, at: new Date() },
      ]);
    } catch (e) {
      setMsgs((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: `Sorry, something went wrong: ${(e as Error).message}`,
          at: new Date(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, accessToken, lang, msgs]);

  const pickLanguage = () => {
    Alert.alert('Chat language', 'Tara will reply in the language you pick.', [
      ...SARVAM_LANGUAGES.map((l) => ({
        text: `${l.nativeLabel} (${l.label})`,
        onPress: () => setLang(l.code),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const langObj = getLanguageByCode(lang);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3"
          style={{ borderBottomColor: t.border, borderBottomWidth: 1, backgroundColor: t.card }}>
          <View className="flex-row items-center gap-3">
            <View
              className="w-10 h-10 rounded-2xl items-center justify-center"
              style={{ backgroundColor: t.brand + '22' }}
            >
              <Sparkles size={18} color={t.brand} />
            </View>
            <View>
              <Text className="text-base font-bold" style={{ color: t.textPrimary }}>Tara</Text>
              <Text className="text-[11px]" style={{ color: t.textSecondary }}>
                AI mutual-fund buddy
              </Text>
            </View>
          </View>
          <Pressable
            onPress={pickLanguage}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: t.brand + '18' }}
          >
            <Globe size={13} color={t.brand} />
            <Text className="text-[12px] font-semibold" style={{ color: t.brand }}>
              {langObj.nativeLabel}
            </Text>
          </Pressable>
        </View>

        {/* Messages */}
        {msgs.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View
              className="w-16 h-16 rounded-3xl items-center justify-center mb-4"
              style={{ backgroundColor: t.brand + '22' }}
            >
              <Bot size={28} color={t.brand} />
            </View>
            <Text className="text-lg font-bold mb-1 text-center" style={{ color: t.textPrimary }}>
              Hi! I&apos;m Tara.
            </Text>
            <Text className="text-sm text-center mb-5" style={{ color: t.textSecondary }}>
              Ask me anything about mutual funds, SIPs, or investing — in {langObj.label}.
            </Text>
            <View className="flex-row flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => send(s)}
                  className="px-3.5 py-2 rounded-full border"
                  style={{ borderColor: t.brand + '44', backgroundColor: t.card }}
                >
                  <Text className="text-[12px]" style={{ color: t.brand }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={msgs}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
            renderItem={({ item }) => <Bubble msg={item} />}
            ListFooterComponent={sending ? <TypingBubble /> : null}
            onContentSizeChange={scrollToEnd}
          />
        )}

        {/* Composer */}
        <View
          className="flex-row items-end gap-2 px-4 py-3"
          style={{
            borderTopColor: t.border,
            borderTopWidth: 1,
            backgroundColor: t.card,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={`Message Tara in ${langObj.label}…`}
            placeholderTextColor={t.textSecondary}
            multiline
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 18,
              backgroundColor: t.bg,
              borderWidth: 1,
              borderColor: t.border,
              color: t.textPrimary,
              fontSize: 14,
            }}
          />
          <Pressable
            onPress={() => send()}
            disabled={!input.trim() || sending}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: !input.trim() || sending ? t.border : t.brand,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Send size={18} color="#ffffff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const t = useTheme();
  const isUser = msg.role === 'user';
  return (
    <View
      className={`flex-row mb-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ alignItems: 'flex-end', gap: 8 }}
    >
      <View
        style={{
          width: 26, height: 26, borderRadius: 13,
          backgroundColor: isUser ? t.brand + '22' : t.card,
          borderWidth: isUser ? 0 : 1,
          borderColor: t.border,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isUser
          ? <User size={13} color={t.brand} />
          : <Bot size={13} color={t.textSecondary} />}
      </View>
      <View
        style={{
          maxWidth: '78%',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 18,
          borderBottomRightRadius: isUser ? 4 : 18,
          borderBottomLeftRadius: isUser ? 18 : 4,
          backgroundColor: isUser ? t.brand : t.card,
          borderWidth: isUser ? 0 : 1,
          borderColor: t.border,
        }}
      >
        {isUser ? (
          <Text style={{ color: '#ffffff', fontSize: 14, lineHeight: 20 }}>{msg.text}</Text>
        ) : (
          <Markdown
            style={{
              body: { color: t.textPrimary, fontSize: 14, lineHeight: 20 },
              strong: { fontWeight: '700' },
              bullet_list: { marginVertical: 4 },
              list_item: { marginVertical: 2 },
              paragraph: { marginTop: 0, marginBottom: 4 },
              code_inline: {
                backgroundColor: t.border, color: t.textPrimary,
                paddingHorizontal: 4, borderRadius: 4,
              },
            }}
          >
            {msg.text}
          </Markdown>
        )}
      </View>
    </View>
  );
}

function TypingBubble() {
  const t = useTheme();
  return (
    <View className="flex-row mb-2.5" style={{ alignItems: 'flex-end', gap: 8 }}>
      <View
        style={{
          width: 26, height: 26, borderRadius: 13, backgroundColor: t.card,
          borderWidth: 1, borderColor: t.border,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Bot size={13} color={t.textSecondary} />
      </View>
      <View
        style={{
          paddingHorizontal: 14, paddingVertical: 12,
          borderRadius: 18, borderBottomLeftRadius: 4,
          backgroundColor: t.card, borderWidth: 1, borderColor: t.border,
        }}
      >
        <ActivityIndicator color={t.textSecondary} size="small" />
      </View>
    </View>
  );
}
