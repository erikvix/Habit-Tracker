import Octicons from '@expo/vector-icons/Octicons';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type { CommitRecord } from '@/data/repositories/commitRepo';
import { createHabitEvaluator } from '@/domain/habitDay';
import { AppText } from '@/ui/components/AppText';
import { Blankslate } from '@/ui/components/Blankslate';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { SectionTitle } from '@/ui/components/Counter';
import { IconButton } from '@/ui/components/IconButton';
import { Stepper } from '@/ui/components/Stepper';
import { useDialog } from '@/ui/dialog/DialogProvider';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space } from '@/ui/theme/tokens';

import { useDayActions, useDayCommits } from '../shared/habitQueries';
import { dayProgressText, formatShortDate } from '../shared/model';
import { useHabitHistory, useToday } from '../shared/queries';
import { canEditDay, commitValueLabel, formatCommitTime, sourceLabel } from './model';

/** Edição de um dia do histórico: adicionar, desfazer, editar minutos e remover commits. */
export function DayEditorScreen({ habitId, date }: { habitId: string; date: string }) {
  const { colors } = useTheme();
  const today = useToday();
  const history = useHabitHistory(habitId);
  const commits = useDayCommits(habitId, date);
  const actions = useDayActions(habitId, date);
  const showError = useDialog().showError('Não foi possível salvar');
  const [minutes, setMinutes] = useState(15);
  const [editing, setEditing] = useState<{ id: string; value: number } | null>(null);

  const wrap = (children: React.ReactNode) => (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: formatShortDate(date) }} />
      {children}
    </ScrollView>
  );

  if (history.isError) {
    return wrap(<Blankslate icon="alert" title="Erro" description={history.error.message} />);
  }
  if (!history.data || !commits.data) return wrap(null);

  const { habit } = history.data;
  const day = createHabitEvaluator(history.data)(date);
  const check = canEditDay(habit, date, today);
  const busy =
    actions.add.isPending ||
    actions.removeLast.isPending ||
    actions.remove.isPending ||
    actions.updateValue.isPending;
  const tick = () => void Haptics.selectionAsync();

  const add = (value: number) => actions.add.mutate(value, { onSuccess: tick, onError: showError });
  const undo = () => actions.removeLast.mutate(undefined, { onSuccess: tick, onError: showError });

  return wrap(
    <>
      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              backgroundColor: colors.levels[day.level],
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
          <AppText variant="heading" style={{ flex: 1 }} numberOfLines={1}>
            {habit.name}
          </AppText>
        </View>
        <AppText variant="mono" style={{ color: day.met ? colors.success : colors.textMuted }}>
          {dayProgressText(habit.goalType, day.progress, day.target)}
        </AppText>
        {!day.active ? (
          <AppText variant="caption">
            Dia inativo: não conta para eficiência nem sequência, mas o commit aparece no gráfico.
          </AppText>
        ) : null}
      </Card>

      {!check.ok ? (
        <AppText variant="muted">{check.reason}</AppText>
      ) : habit.goalType === 'binary' ? (
        <Button
          kind={day.met ? 'default' : 'primary'}
          icon={day.met ? 'undo' : 'check'}
          title={day.met ? 'Desfazer (não feito)' : 'Marcar como feito'}
          disabled={busy}
          onPress={() => (day.met ? undo() : add(1))}
        />
      ) : habit.goalType === 'count' ? (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              icon="dash"
              title="Remover 1"
              disabled={busy || day.progress === 0}
              onPress={undo}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              kind="primary"
              icon="plus"
              title="Adicionar 1"
              disabled={busy}
              onPress={() => add(1)}
            />
          </View>
        </View>
      ) : (
        <Card style={{ gap: space.md }}>
          <AppText style={{ fontWeight: '600' }}>Adicionar tempo</AppText>
          <Stepper
            label="minutos"
            value={minutes}
            min={1}
            max={1440}
            step={5}
            unit="min"
            onChange={setMinutes}
          />
          <Button
            kind="primary"
            icon="plus"
            title={`Adicionar ${minutes || 0} min`}
            disabled={busy || minutes < 1}
            onPress={() => add(minutes)}
          />
        </Card>
      )}

      <View style={{ gap: space.sm }}>
        <SectionTitle title="Commits do dia" count={commits.data.length} />
        {commits.data.length === 0 ? (
          <AppText variant="muted">Nenhum commit neste dia.</AppText>
        ) : (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            {commits.data.map((c, i) => (
              <CommitRow
                key={c.id}
                commit={c}
                first={i === 0}
                goalType={habit.goalType}
                editable={check.ok}
                busy={busy}
                editing={editing?.id === c.id ? editing.value : null}
                onStartEdit={() => setEditing({ id: c.id, value: c.value })}
                onChangeEdit={(value) => setEditing({ id: c.id, value })}
                onCancelEdit={() => setEditing(null)}
                onSaveEdit={(value) =>
                  actions.updateValue.mutate(
                    { id: c.id, value },
                    { onSuccess: () => setEditing(null), onError: showError },
                  )
                }
                onRemove={() =>
                  actions.remove.mutate(c.id, { onSuccess: tick, onError: showError })
                }
              />
            ))}
          </View>
        )}
      </View>
    </>,
  );
}

interface RowProps {
  commit: CommitRecord;
  goalType: 'binary' | 'count' | 'time';
  first: boolean;
  editable: boolean;
  busy: boolean;
  editing: number | null;
  onStartEdit: () => void;
  onChangeEdit: (value: number) => void;
  onCancelEdit: () => void;
  onSaveEdit: (value: number) => void;
  onRemove: () => void;
}

function CommitRow(p: RowProps) {
  const { colors } = useTheme();
  const canEditValue = p.editable && p.goalType === 'time';
  const label = `${formatCommitTime(p.commit.createdAt)} · ${commitValueLabel(p.goalType, p.commit)}`;

  return (
    <View style={{ borderTopWidth: p.first ? 0 : 1, borderTopColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          accessibilityRole={canEditValue ? 'button' : undefined}
          accessibilityLabel={canEditValue ? `Editar minutos de ${label}` : label}
          disabled={!canEditValue}
          onPress={p.onStartEdit}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            paddingVertical: space.md,
            paddingLeft: space.lg,
          }}
        >
          <Octicons name="git-commit" size={16} color={colors.textMuted} />
          <View style={{ flex: 1 }}>
            <AppText variant="mono">{label}</AppText>
            <AppText variant="caption">{sourceLabel(p.commit.source)}</AppText>
          </View>
          {canEditValue ? <Octicons name="pencil" size={14} color={colors.textMuted} /> : null}
        </Pressable>
        {p.editable ? (
          <View style={{ paddingHorizontal: space.md }}>
            <IconButton
              icon="trash"
              kind="invisible"
              accessibilityLabel={`Remover commit ${label}`}
              disabled={p.busy}
              onPress={p.onRemove}
            />
          </View>
        ) : null}
      </View>

      {p.editing !== null ? (
        <View style={{ gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.md }}>
          <Stepper
            label="minutos do commit"
            value={p.editing}
            min={1}
            max={1440}
            step={5}
            unit="min"
            onChange={p.onChangeEdit}
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Cancelar" onPress={p.onCancelEdit} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                kind="primary"
                title="Salvar"
                disabled={p.busy || p.editing < 1}
                onPress={() => p.onSaveEdit(p.editing!)}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
