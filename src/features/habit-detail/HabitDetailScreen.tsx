import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { createHabitEvaluator } from '@/domain/habitDay';
import { addDays } from '@/domain/localDate';
import { sumInRange } from '@/domain/stats';
import type { LocalDate } from '@/domain/types';
import { AppText } from '@/ui/components/AppText';
import { Blankslate } from '@/ui/components/Blankslate';
import { Card } from '@/ui/components/Card';
import { ContributionGraph } from '@/ui/components/ContributionGraph';
import { LevelLegend } from '@/ui/components/LevelLegend';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space } from '@/ui/theme/tokens';

import { dayProgressText, formatShortDate } from '../shared/model';
import { useCommitCounts, useHabitHistory, useSettings, useToday } from '../shared/queries';
import { habitGraphData } from './model';

export function HabitDetailScreen({ id }: { id: string }) {
  const { colors } = useTheme();
  const today = useToday();
  const { data: settings } = useSettings();
  const weekStart = settings?.weekStart ?? 0;
  const history = useHabitHistory(id);
  const graph = useMemo(
    () => (history.data ? habitGraphData(history.data, today, weekStart) : null),
    [history.data, today, weekStart],
  );
  const from = graph?.start ?? addDays(today, -370);
  const counts = useCommitCounts(id, from, today);
  const [selected, setSelected] = useState<LocalDate | null>(null);

  if (history.isError) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Hábito' }} />
        <Blankslate
          icon="alert"
          title="Hábito não encontrado"
          description={history.error.message}
        />
      </Screen>
    );
  }
  if (!history.data || !graph) return <Screen>{null}</Screen>;

  const { habit } = history.data;
  const total = counts.data ? sumInRange(counts.data, from, today) : null;
  const selectedDay = selected ? createHabitEvaluator(history.data)(selected) : null;

  return (
    <Screen>
      <Stack.Screen options={{ title: habit.name }} />
      {habit.description ? <AppText variant="muted">{habit.description}</AppText> : null}

      <Card style={{ gap: space.md, paddingHorizontal: space.md }}>
        <AppText variant="heading">
          <AppText variant="mono" style={{ fontWeight: '600', fontSize: 16 }}>
            {total ?? '…'}
          </AppText>{' '}
          {total === 1 ? 'commit' : 'commits'} no último ano
        </AppText>
        <ContributionGraph
          weeks={graph.weeks}
          monthLabels={graph.monthLabels}
          weekStart={weekStart}
          selected={selected}
          onPressDay={(d) => setSelected((cur) => (cur === d ? null : d))}
        />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: space.sm,
          }}
        >
          <AppText variant="caption" style={{ flex: 1 }} numberOfLines={1}>
            {selectedDay
              ? `${formatShortDate(selectedDay.date)} · ${dayProgressText(
                  habit.goalType,
                  selectedDay.progress,
                  selectedDay.target,
                )}${selectedDay.active ? '' : ' · dia inativo'}`
              : 'Toque num dia para ver o detalhe'}
          </AppText>
          <LevelLegend cell={10} />
        </View>
      </Card>

      {habit.archivedAt ? (
        <AppText variant="caption" style={{ color: colors.textMuted }}>
          Arquivado em {formatShortDate(habit.archivedAt)}
        </AppText>
      ) : null}
    </Screen>
  );
}
