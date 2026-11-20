import { View } from 'react-native';

import { useDatabase } from '@/data/DatabaseProvider';
import { NotificationSettings } from '@/features/notifications/NotificationSettings';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { LevelLegend } from '@/ui/components/LevelLegend';
import { Logo } from '@/ui/components/Logo';
import { Screen } from '@/ui/components/Screen';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space, type ThemePreference } from '@/ui/theme/tokens';

const options: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
];

function ThemeSegmented() {
  const { preference, setPreference } = useTheme();
  return (
    <SegmentedControl
      accessibilityLabel="Tema"
      options={options}
      value={preference}
      onChange={setPreference}
    />
  );
}

export default function SettingsScreen() {
  const { schemaVersion } = useDatabase();
  return (
    <Screen>
      <Card style={{ gap: space.md }}>
        <AppText variant="heading">Aparência</AppText>
        <ThemeSegmented />
        <LevelLegend />
      </Card>
      <NotificationSettings />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Logo size={40} />
        <View>
          <AppText variant="heading">Todo Tracker</AppText>
          <AppText variant="caption">
            <AppText variant="mono" style={{ fontSize: 12 }}>
              v1.0.0
            </AppText>
            {' · schema '}
            <AppText variant="mono" style={{ fontSize: 12 }}>
              v{schemaVersion}
            </AppText>
          </AppText>
        </View>
      </Card>
    </Screen>
  );
}
