import { Blankslate } from '@/ui/components/Blankslate';
import { Screen } from '@/ui/components/Screen';

export default function HabitsScreen() {
  return (
    <Screen>
      <Blankslate
        icon="repo"
        title="Seus hábitos aparecem aqui"
        description="Ativos e arquivados, com meta, dias ativos e lembretes."
      />
    </Screen>
  );
}
