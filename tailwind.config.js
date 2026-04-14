/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          DEFAULT: '#00d09c',
          dark:    '#00b688',
          light:   '#5eead4',
        },

        // Phase accents (mirror the web VoiceBar palette)
        phase: {
          listening: '#f59e0b', // amber — you're speaking
          thinking:  '#38bdf8', // sky   — model working
          speaking:  '#10b981', // emerald — Tara replying
        },

        // Surface colours — read via useTheme() so the app auto-flips
        // between light/dark following the system setting.
        surface: {
          bg:         '#f8fafc',
          card:       '#ffffff',
          border:     '#e2e8f0',
          voice:      '#0f172a',  // voice card stays dark in both themes
          'bg-dark':     '#0a0e1a',
          'card-dark':   '#131a2b',
          'border-dark': 'rgba(255,255,255,0.08)',
        },

        text: {
          primary:         '#0f172a',
          secondary:       '#64748b',
          'primary-dark':   '#f1f5f9',
          'secondary-dark': '#94a3b8',
        },
      },
      fontFamily: {
        display: ['System'],
      },
    },
  },
  plugins: [],
};
