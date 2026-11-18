import { Pressable, View } from 'react-native';

import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { DayStrip } from '@/ui/components/DayStrip';
import { IconButton } from '@/ui/components/IconButton';
import { ProgressBar } from '@/ui/components/ProgressBar';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space } from '@/ui/theme/tokens';

import { progressLabel, progressRatio } from '../shared/model';
import type { TodayItem } from './model';

interface Props {
  item: TodayItem;
  /** value = minutos para hábitos de tempo; ausente = +1. */
  onCommit: (value?: number) => void;
  onUndo: () => void;
  onOpen: () => void;
  busy?: boolean;
}

/** Card da tela Hoje: progresso do dia, últimos 7 dias e ações rápidas por tipo. */
export function HabitCard({ item, onCommit, onUndo, onOpen, busy }: Props) {
  const { colors } = useTheme();
  const { habit } = item.history;
  const { progress, target, level, met } = item.day;
  const name = habit.name;

  return (
    <Card style={{ padding: space.md, gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir ${name}`}
          onPress={onOpen}
          style={{ flex: 1, gap: 2 }}
        >
          <AppText variant="heading" numberOfLines={1} style={{ color: colors.accent }}>
            {name}
          </AppText>
          <AppText variant="mono" style={{ color: met ? colors.success : colors.textMuted }}>
            {progressLabel(habit.goalType, progress, target)}
          </AppText>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: space.xs }}>
          {habit.goalType === 'binary' ? (
            <IconButton
              icon="check"
              kind={met ? 'primary' : 'default'}
              accessibilityLabel={met ? `Desfazer ${name}` : `Commitar ${name}`}
              disabled={busy}
              onPress={() => (met ? onUndo() : onCommit())}
            />
          ) : habit.goalType === 'count' ? (
            <>
              <IconButton
                icon="dash"
                accessibilityLabel={`Remover um de ${name}`}
                disabled={busy || progress === 0}
                onPress={onUndo}
              />
              <IconButton
                icon="plus"
                kind="primary"
                accessibilityLabel={`Adicionar um a ${name}`}
                disabled={busy}
                onPress={() => onCommit()}
              />
            </>
          ) : (
            <>
              <IconButton
                icon="dash"
                accessibilityLabel={`Desfazer último registro de ${name}`}
                disabled={busy || progress === 0}
                onPress={onUndo}
              />
              <IconButton
                text="+5"
                accessibilityLabel={`Adicionar 5 minutos a ${name}`}
                disabled={busy}
                onPress={() => onCommit(5)}
              />
              <IconButton
                text="+15"
                kind="primary"
                accessibilityLabel={`Adicionar 15 minutos a ${name}`}
                disabled={busy}
                onPress={() => onCommit(15)}
              />
            </>
          )}
        </View>
      </View>

      {habit.goalType !== 'binary' ? (
        <ProgressBar
          ratio={progressRatio(progress, target)}
          color={level === 0 ? colors.levels[1] : colors.levels[level]}
        />
      ) : null}
      <DayStrip days={item.week} />
    </Card>
  );
}
