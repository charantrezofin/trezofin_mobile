/**
 * Voice providers supported by the mobile voice assistant.
 *
 * Mirrors the web app (trezofin_ai_frontend/src/lib/constants/providers.js)
 * 1-for-1 so the two clients behave identically.
 *
 * The "auto" pseudo-provider is client-only — the UI resolves it to a
 * concrete provider via RECOMMENDED_PROVIDER_BY_LANGUAGE before every
 * API call, so the backend only ever sees "sarvam" / "google" / "azure".
 */

export type ProviderId = 'auto' | 'sarvam' | 'google' | 'azure';
export type Provider = { id: ProviderId; label: string; tagline: string };
export type Voice = { id: string; label: string };

export const PROVIDERS: Provider[] = [
  { id: 'auto',   label: 'Auto',      tagline: 'Best for the chosen language' },
  { id: 'sarvam', label: 'Sarvam AI', tagline: 'India-native, Bulbul v2' },
  { id: 'google', label: 'Google',    tagline: 'Chirp 3 HD + Gemini' },
  { id: 'azure',  label: 'Azure',     tagline: 'Neural voices, Central India' },
];

export const DEFAULT_PROVIDER: ProviderId = 'auto';

/**
 * Recommended provider per language — optimised for Tier 2/3 vernacular-first
 * users, prioritising natural human-like voice quality. Google Chirp 3 HD is
 * the strongest tier for almost every Indic language we ship. Only Odia has
 * no Chirp 3 HD voice, so we fall back to Sarvam there (Azure also lacks od-IN).
 */
export const RECOMMENDED_PROVIDER_BY_LANGUAGE: Record<string, Exclude<ProviderId, 'auto'>> = {
  'hi-IN': 'google',
  'ta-IN': 'google',
  'te-IN': 'google',
  'kn-IN': 'google',
  'ml-IN': 'google',
  'mr-IN': 'google',
  'gu-IN': 'google',
  'bn-IN': 'google',
  'pa-IN': 'google',
  'en-IN': 'google',
  'od-IN': 'sarvam',
};

/**
 * Resolve "auto" to a concrete provider for the given language.
 * Any explicit provider id passes through unchanged.
 */
export function resolveProvider(providerId: ProviderId, languageCode: string): Exclude<ProviderId, 'auto'> {
  if (providerId && providerId !== 'auto') return providerId;
  return RECOMMENDED_PROVIDER_BY_LANGUAGE[languageCode] ?? 'sarvam';
}

// Per-provider voice lists. `_shared` is used for languages that don't have
// a per-language override (Google's Chirp 3 HD names are the same across all
// locales; Sarvam's speaker pool is language-agnostic).
type VoiceMap = { _shared?: Voice[] } & Record<string, Voice[]>;

export const VOICES: Record<Exclude<ProviderId, 'auto'>, VoiceMap> = {
  sarvam: {
    _shared: [
      { id: 'anushka',  label: 'Anushka (F)' },
      { id: 'manisha',  label: 'Manisha (F)' },
      { id: 'vidya',    label: 'Vidya (F)' },
      { id: 'arya',     label: 'Arya (F)' },
      { id: 'abhilash', label: 'Abhilash (M)' },
      { id: 'karun',    label: 'Karun (M)' },
      { id: 'hitesh',   label: 'Hitesh (M)' },
    ],
  },

  google: {
    // Short voice names — the backend prefixes them with `<locale>-Chirp3-HD-`.
    _shared: [
      { id: 'Aoede',      label: 'Aoede (F)' },
      { id: 'Kore',       label: 'Kore (F)' },
      { id: 'Leda',       label: 'Leda (F)' },
      { id: 'Callirrhoe', label: 'Callirrhoe (F)' },
      { id: 'Orus',       label: 'Orus (M)' },
      { id: 'Puck',       label: 'Puck (M)' },
      { id: 'Charon',     label: 'Charon (M)' },
      { id: 'Fenrir',     label: 'Fenrir (M)' },
    ],
  },

  azure: {
    'hi-IN': [
      { id: 'hi-IN-SwaraNeural',   label: 'Swara (F)' },
      { id: 'hi-IN-AnanyaNeural',  label: 'Ananya (F)' },
      { id: 'hi-IN-KavyaNeural',   label: 'Kavya (F)' },
      { id: 'hi-IN-MadhurNeural',  label: 'Madhur (M)' },
      { id: 'hi-IN-AaravNeural',   label: 'Aarav (M)' },
      { id: 'hi-IN-RehaanNeural',  label: 'Rehaan (M)' },
    ],
    'ta-IN': [
      { id: 'ta-IN-PallaviNeural',  label: 'Pallavi (F)' },
      { id: 'ta-IN-ValluvarNeural', label: 'Valluvar (M)' },
    ],
    'te-IN': [
      { id: 'te-IN-ShrutiNeural', label: 'Shruti (F)' },
      { id: 'te-IN-MohanNeural',  label: 'Mohan (M)' },
    ],
    'kn-IN': [
      { id: 'kn-IN-SapnaNeural',  label: 'Sapna (F)' },
      { id: 'kn-IN-GaganNeural',  label: 'Gagan (M)' },
    ],
    'ml-IN': [
      { id: 'ml-IN-SobhanaNeural', label: 'Sobhana (F)' },
      { id: 'ml-IN-MidhunNeural',  label: 'Midhun (M)' },
    ],
    'bn-IN': [
      { id: 'bn-IN-TanishaaNeural', label: 'Tanishaa (F)' },
      { id: 'bn-IN-BashkarNeural',  label: 'Bashkar (M)' },
    ],
    'gu-IN': [
      { id: 'gu-IN-DhwaniNeural',    label: 'Dhwani (F)' },
      { id: 'gu-IN-NiranjanNeural',  label: 'Niranjan (M)' },
    ],
    'mr-IN': [
      { id: 'mr-IN-AarohiNeural',  label: 'Aarohi (F)' },
      { id: 'mr-IN-ManoharNeural', label: 'Manohar (M)' },
    ],
    'pa-IN': [
      { id: 'pa-IN-VaaniNeural', label: 'Vaani (F)' },
      { id: 'pa-IN-OjasNeural',  label: 'Ojas (M)' },
    ],
    'en-IN': [
      { id: 'en-IN-NeerjaNeural',  label: 'Neerja (F)' },
      { id: 'en-IN-AashiNeural',   label: 'Aashi (F)' },
      { id: 'en-IN-KavyaNeural',   label: 'Kavya (F)' },
      { id: 'en-IN-PrabhatNeural', label: 'Prabhat (M)' },
      { id: 'en-IN-AaravNeural',   label: 'Aarav (M)' },
    ],
    'od-IN': [
      { id: 'hi-IN-SwaraNeural',  label: 'Swara (F, via hi-IN)' },
      { id: 'hi-IN-MadhurNeural', label: 'Madhur (M, via hi-IN)' },
    ],
  },
};

/**
 * Get the list of voice options for the given provider + language.
 * Returns an array of { id, label }; first entry is the default.
 */
export function getVoicesFor(provider: ProviderId, languageCode: string): Voice[] {
  if (provider === 'auto') return [];
  const providerVoices = VOICES[provider];
  if (!providerVoices) return [];
  return providerVoices[languageCode] ?? providerVoices._shared ?? [];
}

/** Default voice id for a given provider + language, or null if none. */
export function getDefaultVoice(provider: ProviderId, languageCode: string): string | null {
  // When resolving defaults for "auto", use the resolved provider's voices
  // so the initial default matches what will actually be called.
  const effective = provider === 'auto' ? resolveProvider(provider, languageCode) : provider;
  const list = getVoicesFor(effective, languageCode);
  return list.length ? list[0].id : null;
}
