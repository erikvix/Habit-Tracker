import { Pressable, View } from 'react-native';

import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { LevelLegend } from '@/ui/components/LevelLegend';
import { Logo } from '@/ui/components/Logo';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { radius, space, type ThemePreference } from '@/ui/theme/tokens';

const options: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
];

function ThemeSegmented() {
  const { colors, preference, setPreference } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.sm,
        padding: 2,
      }}
    >
      {options.map((o) => {
        const selected = o.value === preference;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setPreference(o.value)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: space.sm,
              borderRadius: radius.sm - 1,
              backgroundColor: selected ? colors.canvas : 'transparent',
              borderWidth: selected ? 1 : 0,
              borderColor: colors.border,
            }}
          >
            <AppText style={{ fontWeight: selected ? '600' : '400' }}>{o.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  return (
    <Screen>
      <Card style={{ gap: space.md }}>
        <AppText variant="heading">Aparência</AppText>
        <ThemeSegmented />
        <LevelLegend />
      </Card>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Logo size={40} />
        <View>
          <AppText variant="heading">Todo Tracker</AppText>
          <AppText variant="mono">v1.0.0</AppText>
        </View>
      </Card>
    </Screen>
  );
}
