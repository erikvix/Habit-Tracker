import Octicons from '@expo/vector-icons/Octicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { createScheduleResolver } from '@/domain/schedule';
import { AppText } from '@/ui/components/AppText';
import { Blankslate } from '@/ui/components/Blankslate';
import { Button } from '@/ui/components/Button';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { radius, space } from '@/ui/theme/tokens';

import { describeSchedule } from '../habit-form/model';
import { useHabitList, useToday } from '../shared/queries';

/** Lista de hábitos no estilo lista de repositórios do GitHub. */
export function HabitsScreen() {
  const { colors } = useTheme();
  const today = useToday();
  const list = useHabitList(false);

  if (list.isPending) return <Screen>{null}</Screen>;
  if (list.isError) {
    return (
      <Screen>
        <Blankslate icon="alert" title="Erro ao carregar" description={list.error.message} />
      </Screen>
    );
  }
  if (list.data.length === 0) {
    return (
      <Screen>
        <Blankslate
          icon="repo"
          title="Seus hábitos aparecem aqui"
          description="Ativos e arquivados, com meta, dias ativos e lembretes."
        >
          <Button
            kind="primary"
            icon="plus"
            title="Novo hábito"
            onPress={() => router.push('/habit/new')}
          />
        </Blankslate>
      </Screen>
    );
  }

  return (
    <Screen>
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.sm,
          overflow: 'hidden',
        }}
      >
        {list.data.map(({ habit, schedules }, i) => {
          const s = createScheduleResolver(schedules)(today) ?? schedules.at(-1);
          return (
            <Pressable
              key={habit.id}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${habit.name}`}
              onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                padding: space.lg,
                backgroundColor: pressed ? colors.surface : colors.canvas,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              })}
            >
              <Octicons name="repo" size={16} color={colors.textMuted} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText style={{ color: colors.accent, fontWeight: '600' }} numberOfLines={1}>
                  {habit.name}
                </AppText>
                {s ? (
                  <AppText variant="caption">
                    {describeSchedule(habit.goalType, s.dailyTarget, s.activeDays)}
                  </AppText>
                ) : null}
              </View>
              <Octicons name="chevron-right" size={16} color={colors.textMuted} />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
