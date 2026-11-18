import { View } from 'react-native';

import { AppText } from '@/ui/components/AppText';
import { Blankslate } from '@/ui/components/Blankslate';
import { Card } from '@/ui/components/Card';
import { LevelLegend } from '@/ui/components/LevelLegend';
import { Screen } from '@/ui/components/Screen';
import { space } from '@/ui/theme/tokens';

export default function OverviewScreen() {
  return (
    <Screen>
      <Card style={{ gap: space.md }}>
        <AppText variant="heading">
          <AppText variant="mono" style={{ fontWeight: '600' }}>
            0
          </AppText>{' '}
          contribuições no último ano
        </AppText>
        <View style={{ alignItems: 'flex-end' }}>
          <LevelLegend />
        </View>
      </Card>
      <Blankslate
        icon="graph"
        title="Sem dados ainda"
        description="O gráfico geral soma todos os hábitos concluídos em cada dia."
      />
    </Screen>
  );
}
