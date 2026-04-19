/**
 * AI API client — thin wrapper over the Trezofin backend's /api/v1/ai/*
 * endpoints. Mirrors the web app's lib/api/ai.js 1-for-1 so Tara behaves
 * identically on web and mobile.
 */
import { API_BASE } from './config';

type ChatOptions = {
  mode?: 'chat' | 'voice';
  inputLanguage?: string;
  outputLanguage?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userContext?: string | null;
  provider?: string;     // "sarvam" | "google" | "azure"
  signal?: AbortSignal;
};

type SpeakOptions = {
  speaker?: string;
  pitch?: number;
  pace?: number;
  loudness?: number;
  provider?: string;     // "sarvam" | "google" | "azure"
  signal?: AbortSignal;
};

export async function transcribeAudio(
  accessToken: string,
  audioUri: string,
  mimeType: string,
  languageCode: string = 'unknown',
  options: { signal?: AbortSignal; provider?: string } = {},
): Promise<{ transcribed_text: string; detected_language: string }> {
  const form = new FormData();
  const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('m4a') ? 'm4a' : 'webm';
  // React Native FormData accepts { uri, name, type }
  form.append('audio', {
    uri: audioUri,
    name: `recording.${ext}`,
    type: mimeType,
  } as unknown as Blob);
  form.append('language_code', languageCode);
  if (options.provider) form.append('provider', options.provider);

  const res = await fetch(`${API_BASE}/api/v1/ai/transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
    signal: options.signal,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || 'Transcription failed');
  }
  return res.json();
}

export async function sendChatMessage(
  accessToken: string,
  message: string,
  languageCode: string = 'hi-IN',
  options: ChatOptions = {},
): Promise<{ response_text: string; language_code: string }> {
  const body: Record<string, unknown> = {
    message,
    language_code: languageCode,
    mode: options.mode ?? 'chat',
  };
  if (options.inputLanguage)  body.input_language  = options.inputLanguage;
  if (options.outputLanguage) body.output_language = options.outputLanguage;
  if (options.history?.length) body.history = options.history;
  if (options.userContext) body.user_context = options.userContext;
  if (options.provider) body.provider = options.provider;

  const res = await fetch(`${API_BASE}/api/v1/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || 'Chat request failed');
  }
  return res.json();
}

export async function speakText(
  accessToken: string,
  text: string,
  languageCode: string = 'hi-IN',
  options: SpeakOptions = {},
): Promise<{ audio_base64: string; content_type: string }> {
  const body: Record<string, unknown> = { text, language_code: languageCode };
  if (options.speaker)       body.speaker  = options.speaker;
  if (options.pitch    != null) body.pitch    = options.pitch;
  if (options.pace     != null) body.pace     = options.pace;
  if (options.loudness != null) body.loudness = options.loudness;
  if (options.provider) body.provider = options.provider;

  const res = await fetch(`${API_BASE}/api/v1/ai/speak`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || 'Text-to-speech failed');
  }
  return res.json();
}

export async function getVoiceContext(
  accessToken: string,
  options: { signal?: AbortSignal } = {},
): Promise<{
  risk_category: string | null;
  risk_score: number | null;
  recommended_funds: Array<{ name: string; category: string | null; score: number | null }>;
  context_block: string;
}> {
  const res = await fetch(`${API_BASE}/api/v1/ai/voice-context`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: options.signal,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || 'Failed to load voice context');
  }
  return res.json();
}
