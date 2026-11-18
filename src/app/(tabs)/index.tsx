import { AppText } from '@/ui/components/AppText';
import { Blankslate } from '@/ui/components/Blankslate';
import { Logo } from '@/ui/components/Logo';
import { Screen } from '@/ui/components/Screen';

export default function TodayScreen() {
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Screen>
      <AppText variant="muted" style={{ textTransform: 'capitalize' }}>
        {today}
      </AppText>
      <Blankslate
        visual={<Logo size={72} />}
        title="Nenhum hábito ainda"
        description="Crie um hábito e cada conclusão vira um commit no seu gráfico de contribuições."
      />
    </Screen>
  );
}
