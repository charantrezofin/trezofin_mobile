/**
 * Theme tokens for Trezofin AI mobile.
 *
 * Two themes: light + dark. The app follows the system setting by
 * default; we'll add a user-overridable toggle in Settings later.
 *
 * The voice card is dark in BOTH themes — it's the hero element and
 * looks best as a solid dark surface with the phase-coloured border.
 */

export type Theme = {
  name: 'light' | 'dark';
  bg: string;
  card: string;
  border: string;
  voiceCard: string;         // always dark
  voiceCardBorderIdle: string;

  textPrimary: string;
  textSecondary: string;
  textOnVoice: string;
  textOnVoiceMuted: string;

  brand: string;
  brandDark: string;

  // Phase accents — identical across themes for brand consistency
  phase: {
    listening: string;       // amber — you speaking
    thinking: string;        // sky   — model working
    speaking: string;        // emerald — Tara replying
    idle: string;
  };

  statusBar: 'light' | 'dark';
};

export const LIGHT: Theme = {
  name: 'light',
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  voiceCard: '#0f172a',
  voiceCardBorderIdle: 'rgba(255,255,255,0.08)',

  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textOnVoice: '#f1f5f9',
  textOnVoiceMuted: 'rgba(241,245,249,0.6)',

  brand: '#00d09c',
  brandDark: '#00b688',

  phase: {
    listening: '#f59e0b',
    thinking:  '#38bdf8',
    speaking:  '#10b981',
    idle:      '#334155',
  },

  statusBar: 'dark',
};

export const DARK: Theme = {
  name: 'dark',
  bg: '#0a0e1a',
  card: '#131a2b',
  border: 'rgba(255,255,255,0.08)',
  voiceCard: '#0f172a',
  voiceCardBorderIdle: 'rgba(255,255,255,0.06)',

  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textOnVoice: '#f1f5f9',
  textOnVoiceMuted: 'rgba(241,245,249,0.6)',

  brand: '#00d09c',
  brandDark: '#00b688',

  phase: {
    listening: '#f59e0b',
    thinking:  '#38bdf8',
    speaking:  '#10b981',
    idle:      '#334155',
  },

  statusBar: 'light',
};
