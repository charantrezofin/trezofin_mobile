import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { DARK, LIGHT, type Theme } from './index';

const ThemeContext = createContext<Theme>(LIGHT);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme(); // follows system setting
  const theme = useMemo(() => (scheme === 'dark' ? DARK : LIGHT), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
