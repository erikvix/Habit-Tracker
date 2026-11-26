import { View } from 'react-native';

import { useDatabase } from '@/data/DatabaseProvider';
import { BackupCard } from '@/features/backup/BackupCard';
import { NotificationSettings } from '@/features/notifications/NotificationSettings';
import { AppearanceCard } from '@/features/settings/PreferenceCards';
import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { Logo } from '@/ui/components/Logo';
import { Screen } from '@/ui/components/Screen';
import { space } from '@/ui/theme/tokens';

export default function SettingsScreen() {
  const { schemaVersion } = useDatabase();
  return (
    <Screen>
      <AppearanceCard />
      <NotificationSettings />
      <BackupCard />
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
