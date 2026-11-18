import Octicons from '@expo/vector-icons/Octicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { HabitRecord } from '@/data/repositories/habitRepo';
import { createScheduleResolver } from '@/domain/schedule';
import type { HabitSchedule, LocalDate } from '@/domain/types';
import { AppText } from '@/ui/components/AppText';
import { Blankslate } from '@/ui/components/Blankslate';
import { Button } from '@/ui/components/Button';
import { Counter } from '@/ui/components/Counter';
import { Fab } from '@/ui/components/Fab';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { radius, space } from '@/ui/theme/tokens';

import { describeSchedule } from '../habit-form/model';
import { useHabitList, useToday } from '../shared/queries';
import { splitArchived } from './model';

type Item = { habit: HabitRecord; schedules: HabitSchedule[] };

const openNew = () => router.push('/habit/new');

/** Lista de hábitos no estilo lista de repositórios do GitHub, com arquivados recolhidos. */
export function HabitsScreen() {
  const { colors } = useTheme();
  const today = useToday();
  const list = useHabitList(true);
  const [showArchived, setShowArchived] = useState(false);

  if (list.isPending) return <Screen>{null}</Screen>;
  if (list.isError) {
    return (
      <Screen>
        <Blankslate icon="alert" title="Erro ao carregar" description={list.error.message} />
      </Screen>
    );
  }

  const { active, archived } = splitArchived(list.data);
  if (active.length === 0 && archived.length === 0) {
    return (
      <Screen>
        <Blankslate
          icon="repo"
          title="Seus hábitos aparecem aqui"
          description="Ativos e arquivados, com meta, dias ativos e lembretes."
        >
          <Button kind="primary" icon="plus" title="Novo hábito" onPress={openNew} />
        </Blankslate>
      </Screen>
    );
  }

  return (
    <Screen fab={<Fab icon="plus" accessibilityLabel="Novo hábito" onPress={openNew} />}>
      {active.length > 0 ? (
        <HabitBox items={active} today={today} />
      ) : (
        <Blankslate icon="repo" title="Nenhum hábito ativo" />
      )}

      {archived.length > 0 ? (
        <View style={{ gap: space.md }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showArchived }}
            onPress={() => setShowArchived((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
          >
            <Octicons
              name={showArchived ? 'chevron-down' : 'chevron-right'}
              size={16}
              color={colors.textMuted}
            />
            <AppText variant="muted" style={{ fontWeight: '600' }}>
              Arquivados
            </AppText>
            <Counter count={archived.length} />
          </Pressable>
          {showArchived ? <HabitBox items={archived} today={today} muted /> : null}
        </View>
      ) : null}
    </Screen>
  );
}

function HabitBox({
  items,
  today,
  muted,
}: {
  items: readonly Item[];
  today: LocalDate;
  muted?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.sm,
        overflow: 'hidden',
      }}
    >
      {items.map(({ habit, schedules }, i) => {
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
            <Octicons name={muted ? 'archive' : 'repo'} size={16} color={colors.textMuted} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText
                style={{ color: muted ? colors.textMuted : colors.accent, fontWeight: '600' }}
                numberOfLines={1}
              >
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
  );
}
