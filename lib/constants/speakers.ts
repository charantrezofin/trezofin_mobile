export type SarvamSpeaker = {
  id: string;
  label: string;
  gender: 'Female' | 'Male';
  tone: string;
};

export const SARVAM_SPEAKERS: SarvamSpeaker[] = [
  { id: 'anushka',  label: 'Anushka',  gender: 'Female', tone: 'Warm, friendly' },
  { id: 'manisha',  label: 'Manisha',  gender: 'Female', tone: 'Bright, clear'  },
  { id: 'vidya',    label: 'Vidya',    gender: 'Female', tone: 'Calm, soft'     },
  { id: 'arya',     label: 'Arya',     gender: 'Female', tone: 'Youthful, lively' },
  { id: 'abhilash', label: 'Abhilash', gender: 'Male',   tone: 'Warm, natural'  },
  { id: 'karun',    label: 'Karun',    gender: 'Male',   tone: 'Deep, steady'   },
  { id: 'hitesh',   label: 'Hitesh',   gender: 'Male',   tone: 'Energetic'      },
];

export const DEFAULT_SPEAKER_ID = 'anushka';
