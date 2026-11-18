import Octicons from '@expo/vector-icons/Octicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { isGoalMet } from '@/domain/level';
import { AppText } from '@/ui/components/AppText';
import { Blankslate } from '@/ui/components/Blankslate';
import { Button } from '@/ui/components/Button';
import { Fab } from '@/ui/components/Fab';
import { Logo } from '@/ui/components/Logo';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space } from '@/ui/theme/tokens';

import { formatShortDate } from '../shared/model';
import { TodayTasks } from '../tasks/TodayTasks';
import { useBoard, useCommitActions, useToday } from '../shared/queries';
import { HabitCard } from './HabitCard';
import { buildTodayList, todaySummary, type TodayItem } from './model';

const showError = (e: unknown) => Alert.alert('Não foi possível salvar', (e as Error).message);
const openNewHabit = () => router.push('/habit/new');

export function TodayScreen() {
  const { colors } = useTheme();
  const today = useToday();
  const board = useBoard(today);
  const { commit, undo } = useCommitActions();
  const [showOther, setShowOther] = useState(false);

  if (board.isPending) return <Screen>{null}</Screen>;
  if (board.isError) {
    return (
      <Screen>
        <Blankslate icon="alert" title="Erro ao carregar" description={board.error.message} />
      </Screen>
    );
  }

  const list = buildTodayList(board.data, today);
  const summary = todaySummary(list);
  const busy = commit.isPending || undo.isPending;

  const onCommit = (item: TodayItem, value?: number) => {
    const { goalType } = item.history.habit;
    const added = goalType === 'time' ? (value ?? 1) : 1;
    const reachesGoal =
      !item.day.met && isGoalMet(item.day.progress + added, item.day.target ?? 1, goalType);
    commit.mutate(
      { habitId: item.history.habit.id, value },
      {
        onSuccess: () =>
          void (reachesGoal
            ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
        onError: showError,
      },
    );
  };
  const onUndo = (item: TodayItem) =>
    undo.mutate(item.history.habit.id, {
      onSuccess: () => void Haptics.selectionAsync(),
      onError: showError,
    });

  const renderCard = (item: TodayItem) => (
    <HabitCard
      key={item.history.habit.id}
      item={item}
      busy={busy}
      onCommit={(v) => onCommit(item, v)}
      onUndo={() => onUndo(item)}
      onOpen={() => router.push({ pathname: '/habit/[id]', params: { id: item.history.habit.id } })}
    />
  );

  return (
    <Screen
      fab={
        // Sem hábitos, o estado vazio já tem o botão "Novo hábito".
        board.data.length > 0 ? (
          <Fab icon="plus" accessibilityLabel="Novo hábito" onPress={openNewHabit} />
        ) : null
      }
    >
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
      >
        <AppText variant="muted" style={{ textTransform: 'capitalize' }}>
          {formatShortDate(today)}
        </AppText>
        {summary.total > 0 ? (
          <AppText variant="mono" style={{ color: colors.textMuted }}>
            {summary.done}/{summary.total} feitos
          </AppText>
        ) : null}
      </View>

      {board.data.length === 0 ? (
        <Blankslate
          visual={<Logo size={72} />}
          title="Nenhum hábito ainda"
          description="Crie um hábito e cada conclusão vira um commit no seu gráfico de contribuições."
        >
          <Button
            kind="primary"
            icon="plus"
            title="Novo hábito"
            onPress={() => router.push('/habit/new')}
          />
        </Blankslate>
      ) : list.active.length === 0 ? (
        <Blankslate icon="moon" title="Dia livre" description="Nenhum hábito ativo para hoje." />
      ) : (
        list.active.map(renderCard)
      )}

      <TodayTasks today={today} />

      {list.other.length > 0 ? (
        <View style={{ gap: space.md }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showOther }}
            onPress={() => setShowOther((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
          >
            <Octicons
              name={showOther ? 'chevron-down' : 'chevron-right'}
              size={16}
              color={colors.textMuted}
            />
            <AppText variant="muted" style={{ fontWeight: '600' }}>
              Fora de hoje ({list.other.length})
            </AppText>
          </Pressable>
          {showOther ? list.other.map(renderCard) : null}
        </View>
      ) : null}
    </Screen>
  );
}
