import { useState } from 'react';
import { View } from 'react-native';

import type { LocalDate, Weekday } from '@/domain/types';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { DatePickerSheet } from '@/ui/components/DatePickerSheet';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { TextField } from '@/ui/components/TextField';
import { TimePickerSheet } from '@/ui/components/TimePickerSheet';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space } from '@/ui/theme/tokens';

import { formatShortDate } from '../shared/model';
import {
  emptyTaskForm,
  formatMinute,
  pastDueToKeep,
  resolveDueDate,
  validateTaskForm,
  type DueChoice,
  type TaskFormErrors,
  type TaskFormValues,
} from './model';

const DUE_OPTIONS: readonly { value: DueChoice; label: string }[] = [
  { value: 'none', label: 'Sem prazo' },
  { value: 'today', label: 'Hoje' },
  { value: 'tomorrow', label: 'Amanhã' },
  { value: 'custom', label: 'Data' },
];

interface Props {
  today: LocalDate;
  initial?: TaskFormValues;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (values: TaskFormValues) => void;
  onDelete?: () => void;
  /** Só na edição: concluir / reabrir sem precisar da lista. */
  completion?: { done: boolean; busy?: boolean; onToggle: () => void };
  weekStart?: Weekday;
}

export function TaskForm({
  today,
  weekStart = 0,
  initial = emptyTaskForm,
  submitLabel,
  submitting,
  onSubmit,
  onDelete,
  completion,
}: Props) {
  const { colors } = useTheme();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [touched, setTouched] = useState(false);
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const dueDate = resolveDueDate(values, today);
  const keepPast = pastDueToKeep(initial, today);
  const validate = (v: TaskFormValues) => validateTaskForm(v, today, keepPast);

  const update = (next: TaskFormValues) => {
    setValues(next);
    if (touched) setErrors(validate(next));
  };

  const submit = () => {
    setTouched(true);
    const e = validate(values);
    setErrors(e);
    if (Object.keys(e).length === 0) onSubmit(values);
  };

  return (
    <View style={{ gap: space.lg }}>
      <TextField
        label="Título"
        placeholder="Ex.: Pagar boleto do condomínio"
        value={values.title}
        onChangeText={(title) => update({ ...values, title })}
        error={errors.title}
        maxLength={200}
        autoFocus={!initial.title}
      />
      <TextField
        label="Notas (opcional)"
        value={values.notes}
        onChangeText={(notes) => update({ ...values, notes })}
        multiline
      />

      <Card style={{ gap: space.md }}>
        <AppText style={{ fontWeight: '600' }}>Prazo</AppText>
        <SegmentedControl
          accessibilityLabel="Prazo"
          options={DUE_OPTIONS}
          value={values.due}
          onChange={(due) => {
            if (due === 'custom' && !values.customDate) setPicker('date');
            update({ ...values, due, dueMinute: due === 'none' ? null : values.dueMinute });
          }}
        />
        {values.due === 'custom' ? (
          <Button
            icon="calendar"
            title={values.customDate ? formatShortDate(values.customDate) : 'Escolher data'}
            onPress={() => setPicker('date')}
          />
        ) : null}
        {errors.due ? (
          <AppText variant="caption" style={{ color: colors.danger }}>
            {errors.due}
          </AppText>
        ) : null}

        {dueDate ? (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                icon="clock"
                title={
                  values.dueMinute !== null ? formatMinute(values.dueMinute) : 'Adicionar horário'
                }
                onPress={() => setPicker('time')}
              />
            </View>
            {values.dueMinute !== null ? (
              <Button
                icon="x"
                title="Sem horário"
                onPress={() => update({ ...values, dueMinute: null })}
              />
            ) : null}
          </View>
        ) : null}
      </Card>

      <Button
        kind="primary"
        title={submitting ? 'Salvando…' : submitLabel}
        disabled={submitting}
        onPress={submit}
      />
      {completion ? (
        <Button
          icon={completion.done ? 'undo' : 'check-circle'}
          title={completion.done ? 'Reabrir tarefa' : 'Marcar como concluída'}
          disabled={completion.busy}
          onPress={completion.onToggle}
        />
      ) : null}
      {onDelete ? (
        <Button kind="danger" icon="trash" title="Excluir tarefa" onPress={onDelete} />
      ) : null}

      <DatePickerSheet
        visible={picker === 'date'}
        value={values.customDate}
        today={today}
        minDate={today}
        weekStart={weekStart}
        onClose={() => setPicker(null)}
        onSelect={(customDate) => {
          setPicker(null);
          update({ ...values, due: 'custom', customDate });
        }}
      />
      <TimePickerSheet
        visible={picker === 'time'}
        value={values.dueMinute}
        onClose={() => setPicker(null)}
        onSelect={(dueMinute) => {
          setPicker(null);
          update({ ...values, dueMinute });
        }}
      />
    </View>
  );
}
