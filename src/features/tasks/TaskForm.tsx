import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { View } from 'react-native';

import { makeLocalDate } from '@/domain/localDate';
import type { LocalDate } from '@/domain/types';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { TextField } from '@/ui/components/TextField';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space } from '@/ui/theme/tokens';

import { formatShortDate } from '../shared/model';
import {
  emptyTaskForm,
  formatMinute,
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

const toDate = (ld: LocalDate) => new Date(`${ld}T12:00:00`);
const fromDate = (d: Date) => makeLocalDate(d.getFullYear(), d.getMonth() + 1, d.getDate());

interface Props {
  today: LocalDate;
  initial?: TaskFormValues;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (values: TaskFormValues) => void;
  onDelete?: () => void;
  /** Só na edição: concluir / reabrir sem precisar da lista. */
  completion?: { done: boolean; busy?: boolean; onToggle: () => void };
}

export function TaskForm({
  today,
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
  const dueDate = resolveDueDate(values, today);

  const update = (next: TaskFormValues) => {
    setValues(next);
    if (touched) setErrors(validateTaskForm(next));
  };

  const pickDate = () =>
    DateTimePickerAndroid.open({
      mode: 'date',
      value: toDate(values.customDate ?? today),
      onValueChange: (_e, date) => update({ ...values, due: 'custom', customDate: fromDate(date) }),
    });

  const pickTime = () => {
    const base = new Date();
    const m = values.dueMinute ?? 9 * 60;
    base.setHours(Math.floor(m / 60), m % 60, 0, 0);
    DateTimePickerAndroid.open({
      mode: 'time',
      is24Hour: true,
      value: base,
      onValueChange: (_e, date) =>
        update({ ...values, dueMinute: date.getHours() * 60 + date.getMinutes() }),
    });
  };

  const submit = () => {
    setTouched(true);
    const e = validateTaskForm(values);
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
            if (due === 'custom' && !values.customDate) pickDate();
            update({ ...values, due, dueMinute: due === 'none' ? null : values.dueMinute });
          }}
        />
        {values.due === 'custom' ? (
          <Button
            icon="calendar"
            title={values.customDate ? formatShortDate(values.customDate) : 'Escolher data'}
            onPress={pickDate}
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
                onPress={pickTime}
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
    </View>
  );
}
