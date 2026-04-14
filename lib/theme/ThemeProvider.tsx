import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK, LIGHT, type Theme } from './index';

export type ThemePref = 'auto' | 'light' | 'dark';

type Ctx = {
  theme: Theme;
  pref: ThemePref;
  setPref: (p: ThemePref) => Promise<void>;
};

const ThemeContext = createContext<Ctx>({
  theme: LIGHT,
  pref: 'auto',
  setPref: async () => {},
});

const KEY = 'trezofin_theme_pref';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('auto');

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'auto') setPrefState(v);
    });
  }, []);

  const theme = useMemo<Theme>(() => {
    const effective = pref === 'auto' ? (system ?? 'light') : pref;
    return effective === 'dark' ? DARK : LIGHT;
  }, [pref, system]);

  const setPref = useCallback(async (p: ThemePref) => {
    setPrefState(p);
    await AsyncStorage.setItem(KEY, p);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, pref, setPref }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemePref() {
  return useContext(ThemeContext);
}
