import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo } from 'react';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { AppThemeProvider, useTheme } from '@/ui/theme/ThemeProvider';

function RootNavigator() {
  const { scheme, colors } = useTheme();

  // Cor da janela nativa (evita flash branco em transições e no teclado).
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.canvas);
  }, [colors.canvas]);

  const navTheme = useMemo<Theme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.canvas,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.accent,
      },
    };
  }, [scheme, colors]);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.canvas } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <DatabaseProvider>
        <RootNavigator />
      </DatabaseProvider>
    </AppThemeProvider>
  );
}
