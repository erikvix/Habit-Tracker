import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { createHabitEvaluator } from '@/domain/habitDay';
import { addDays } from '@/domain/localDate';
import { sumInRange } from '@/domain/stats';
import type { LocalDate } from '@/domain/types';
import { AppText } from '@/ui/components/AppText';
import { Blankslate } from '@/ui/components/Blankslate';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { ContributionGraph } from '@/ui/components/ContributionGraph';
import { IconButton } from '@/ui/components/IconButton';
import { LevelLegend } from '@/ui/components/LevelLegend';
import { Screen } from '@/ui/components/Screen';
import { useDialog } from '@/ui/dialog/DialogProvider';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { radius, space } from '@/ui/theme/tokens';

import { canEditDay } from '../habit-day/model';
import { HabitMetrics } from '../metrics/HabitMetrics';
import { useTimer } from '../timer/useTimer';
import { useHabitActions } from '../shared/habitQueries';
import { dayProgressText, formatShortDate } from '../shared/model';
import { useCommitCounts, useHabitHistory, useSettings, useToday } from '../shared/queries';
import { habitGraphData } from './model';

export function HabitDetailScreen({ id }: { id: string }) {
  const { colors } = useTheme();
  const dialog = useDialog();
  const showError = dialog.showError('Não foi possível concluir');
  const today = useToday();
  const { data: settings } = useSettings();
  const weekStart = settings?.weekStart ?? 0;
  const history = useHabitHistory(id);
  const actions = useHabitActions(id);
  const timer = useTimer();
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
  const archived = !!habit.archivedAt;
  const total = counts.data ? sumInRange(counts.data, from, today) : null;
  const selectedDay = selected ? createHabitEvaluator(history.data)(selected) : null;
  const canEditSelected = selected ? canEditDay(habit, selected, today).ok : false;

  const confirmArchive = async () => {
    const ok = await dialog.confirm({
      title: 'Arquivar hábito?',
      message:
        'O histórico é mantido, ele sai da tela Hoje e os lembretes param. Você pode desarquivar depois.',
      confirmLabel: 'Arquivar',
    });
    if (ok) {
      actions.archive.mutate(undefined, {
        onSuccess: () => void Haptics.selectionAsync(),
        onError: showError,
      });
    }
  };

  const confirmDelete = async () => {
    const ok = await dialog.confirm({
      title: 'Excluir hábito?',
      message: `"${habit.name}" e todos os seus commits serão apagados definitivamente. Isso não pode ser desfeito.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (ok) {
      actions.remove.mutate(undefined, { onSuccess: () => router.back(), onError: showError });
    }
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: habit.name,
          headerRight: archived
            ? undefined
            : () => (
                <IconButton
                  icon="pencil"
                  size={32}
                  accessibilityLabel="Editar hábito"
                  onPress={() =>
                    router.push({ pathname: '/habit/edit/[id]', params: { id: habit.id } })
                  }
                />
              ),
        }}
      />

      {archived ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            padding: space.md,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <AppText variant="muted" style={{ flex: 1 }}>
            Arquivado em {formatShortDate(habit.archivedAt!)}. Só leitura.
          </AppText>
        </View>
      ) : null}

      {habit.description ? <AppText variant="muted">{habit.description}</AppText> : null}

      <Card style={{ gap: space.md, paddingHorizontal: space.md }}>
        <AppText variant="heading">Últimos 12 meses</AppText>
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
        {selected && canEditSelected ? (
          <Button
            icon="pencil"
            title={`Editar ${formatShortDate(selected)}`}
            onPress={() =>
              router.push({
                pathname: '/habit/day/[id]/[date]',
                params: { id: habit.id, date: selected },
              })
            }
          />
        ) : null}
      </Card>

      {habit.goalType === 'time' && !archived ? (
        timer.active?.habitId === habit.id ? (
          <Button
            kind="primary"
            icon="stopwatch"
            title={`Cronômetro rodando · ${timer.elapsed}`}
            onPress={() => router.navigate('/')}
          />
        ) : (
          <Button
            icon="play"
            title="Iniciar cronômetro"
            disabled={timer.busy}
            onPress={() => void timer.start(habit)}
          />
        )
      ) : null}

      <HabitMetrics history={history.data} today={today} yearFrom={from} totalCommits={total} />

      <View style={{ gap: space.sm, marginTop: space.lg }}>
        {archived ? (
          <Button
            icon="archive"
            title="Desarquivar hábito"
            disabled={actions.unarchive.isPending}
            onPress={() => actions.unarchive.mutate(undefined, { onError: showError })}
          />
        ) : (
          <Button
            icon="archive"
            title="Arquivar hábito"
            disabled={actions.archive.isPending}
            onPress={confirmArchive}
          />
        )}
        <Button kind="danger" icon="trash" title="Excluir hábito" onPress={confirmDelete} />
      </View>
    </Screen>
  );
}
