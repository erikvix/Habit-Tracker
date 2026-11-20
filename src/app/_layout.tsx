import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, useState } from 'react';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { NotificationsBridge } from '@/features/notifications/NotificationsBridge';
import { DialogProvider } from '@/ui/dialog/DialogProvider';
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
      <NotificationsBridge />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.canvas },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600', fontSize: 16 },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="habit/new" options={{ title: 'Novo hábito', presentation: 'modal' }} />
        <Stack.Screen name="habit/[id]" options={{ title: '' }} />
        <Stack.Screen
          name="habit/edit/[id]"
          options={{ title: 'Editar hábito', presentation: 'modal' }}
        />
        <Stack.Screen
          name="habit/day/[id]/[date]"
          options={{ title: 'Editar dia', presentation: 'modal' }}
        />
        <Stack.Screen name="task/new" options={{ title: 'Nova tarefa', presentation: 'modal' }} />
        <Stack.Screen
          name="task/[id]"
          options={{ title: 'Editar tarefa', presentation: 'modal' }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Dados locais: as mutações invalidam o cache, então nada fica "velho" sozinho.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: Infinity, retry: false },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <AppThemeProvider>
      <DatabaseProvider>
        <QueryClientProvider client={queryClient}>
          <DialogProvider>
            <RootNavigator />
          </DialogProvider>
        </QueryClientProvider>
      </DatabaseProvider>
    </AppThemeProvider>
  );
}
