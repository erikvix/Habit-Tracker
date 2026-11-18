import Octicons from '@expo/vector-icons/Octicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';

import { useTheme } from '@/ui/theme/ThemeProvider';

type IconName = ComponentProps<typeof Octicons>['name'];

export default function TabsLayout() {
  const { colors } = useTheme();
  const tab = (title: string, icon: IconName) => ({
    title,
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <Octicons name={icon} size={20} color={focused ? colors.text : colors.textMuted} />
    ),
  });
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600', fontSize: 16 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen name="index" options={tab('Hoje', 'git-commit')} />
      <Tabs.Screen name="overview" options={tab('Geral', 'graph')} />
      <Tabs.Screen name="habits" options={tab('Hábitos', 'repo')} />
      <Tabs.Screen name="settings" options={tab('Ajustes', 'gear')} />
    </Tabs>
  );
}
