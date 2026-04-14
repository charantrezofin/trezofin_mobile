export type SarvamLanguage = {
  code: string;           // BCP-47, e.g. "hi-IN"
  label: string;          // English label
  nativeLabel: string;    // label in own script
};

export const SARVAM_LANGUAGES: SarvamLanguage[] = [
  { code: 'en-IN', label: 'English',  nativeLabel: 'English'  },
  { code: 'hi-IN', label: 'Hindi',    nativeLabel: 'हिन्दी'    },
  { code: 'te-IN', label: 'Telugu',   nativeLabel: 'తెలుగు'    },
  { code: 'ta-IN', label: 'Tamil',    nativeLabel: 'தமிழ்'     },
  { code: 'kn-IN', label: 'Kannada',  nativeLabel: 'ಕನ್ನಡ'     },
  { code: 'ml-IN', label: 'Malayalam',nativeLabel: 'മലയാളം'   },
  { code: 'mr-IN', label: 'Marathi',  nativeLabel: 'मराठी'     },
  { code: 'gu-IN', label: 'Gujarati', nativeLabel: 'ગુજરાતી'  },
  { code: 'bn-IN', label: 'Bengali',  nativeLabel: 'বাংলা'    },
  { code: 'pa-IN', label: 'Punjabi',  nativeLabel: 'ਪੰਜਾਬੀ'    },
  { code: 'od-IN', label: 'Odia',     nativeLabel: 'ଓଡ଼ିଆ'     },
];

export const DEFAULT_LANGUAGE_CODE = 'en-IN';

export function getLanguageByCode(code: string): SarvamLanguage {
  return SARVAM_LANGUAGES.find((l) => l.code === code) ?? SARVAM_LANGUAGES[0];
}
