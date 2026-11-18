import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { resolveScheme } from './resolveScheme';
import { palettes, type ColorSchemeName, type ThemeColors, type ThemePreference } from './tokens';

interface ThemeContextValue {
  scheme: ColorSchemeName;
  colors: ThemeColors;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  // Padrão: escuro. A preferência passa a ser persistida (SQLite) na fase de Ajustes.
  const [preference, setPreference] = useState<ThemePreference>('dark');
  const scheme = resolveScheme(preference, system);

  const value = useMemo(
    () => ({ scheme, colors: palettes[scheme], preference, setPreference }),
    [scheme, preference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de <AppThemeProvider>');
  return ctx;
}
