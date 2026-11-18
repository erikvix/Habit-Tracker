import Octicons from '@expo/vector-icons/Octicons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { IconButton } from '@/ui/components/IconButton';
import { useTheme } from '@/ui/theme/ThemeProvider';

type IconName = ComponentProps<typeof Octicons>['name'];

// Novo hábito: botão flutuante nas telas Hoje e Hábitos. Nova tarefa: + no header.
const newTask = () => (
  <View style={{ marginRight: 12 }}>
    <IconButton
      icon="plus"
      size={32}
      accessibilityLabel="Nova tarefa"
      onPress={() => router.push('/task/new')}
    />
  </View>
);

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
      <Tabs.Screen name="tasks" options={{ ...tab('Tarefas', 'tasklist'), headerRight: newTask }} />
      <Tabs.Screen name="overview" options={tab('Geral', 'graph')} />
      <Tabs.Screen name="habits" options={tab('Hábitos', 'repo')} />
      <Tabs.Screen name="settings" options={tab('Ajustes', 'gear')} />
    </Tabs>
  );
}
