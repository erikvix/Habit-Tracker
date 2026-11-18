import { useState } from 'react';
import { View } from 'react-native';

import type { GoalType } from '@/domain/types';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { Stepper } from '@/ui/components/Stepper';
import { TextField } from '@/ui/components/TextField';
import { WeekdayPicker } from '@/ui/components/WeekdayPicker';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space } from '@/ui/theme/tokens';

import { unitLabel } from '../shared/model';
import {
  changeGoalType,
  emptyHabitForm,
  MAX_TARGET,
  validateHabitForm,
  type HabitFormErrors,
  type HabitFormValues,
} from './model';

const GOAL_OPTIONS: readonly { value: GoalType; label: string }[] = [
  { value: 'binary', label: 'Sim/não' },
  { value: 'count', label: 'Contagem' },
  { value: 'time', label: 'Tempo' },
];

const GOAL_HINT: Record<GoalType, string> = {
  binary: 'Um commit por dia marca como feito.',
  count: 'Cada registro é um commit. Ex.: 8 copos de água.',
  time: 'Some minutos ao longo do dia. Ex.: 30 min de leitura.',
};

interface Props {
  initial?: HabitFormValues;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (values: HabitFormValues) => void;
  /** Edição: o tipo não muda depois de criado (mudaria o sentido do histórico). */
  lockGoalType?: boolean;
  /** Aviso exibido acima do botão (ex.: mudanças valem a partir de hoje). */
  notice?: string;
}

export function HabitForm({
  initial = emptyHabitForm,
  submitLabel,
  submitting,
  onSubmit,
  lockGoalType,
  notice,
}: Props) {
  const { colors } = useTheme();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<HabitFormErrors>({});
  const [touched, setTouched] = useState(false);

  const update = (next: HabitFormValues) => {
    setValues(next);
    if (touched) setErrors(validateHabitForm(next));
  };

  const submit = () => {
    setTouched(true);
    const e = validateHabitForm(values);
    setErrors(e);
    if (Object.keys(e).length === 0) onSubmit(values);
  };

  return (
    <View style={{ gap: space.lg }}>
      <TextField
        label="Nome"
        placeholder="Ex.: Beber água"
        value={values.name}
        onChangeText={(name) => update({ ...values, name })}
        error={errors.name}
        maxLength={80}
        autoFocus={!lockGoalType}
        returnKeyType="next"
      />
      <TextField
        label="Descrição (opcional)"
        placeholder="Por que esse hábito importa?"
        value={values.description}
        onChangeText={(description) => update({ ...values, description })}
        multiline
      />

      <Card style={{ gap: space.md }}>
        <AppText style={{ fontWeight: '600' }}>Tipo de meta</AppText>
        {lockGoalType ? (
          <>
            <AppText variant="mono">
              {GOAL_OPTIONS.find((o) => o.value === values.goalType)?.label}
            </AppText>
            <AppText variant="caption">
              O tipo não pode ser alterado depois de criado. Para trocar, crie outro hábito.
            </AppText>
          </>
        ) : (
          <>
            <SegmentedControl
              accessibilityLabel="Tipo de meta"
              options={GOAL_OPTIONS}
              value={values.goalType}
              onChange={(g) => update(changeGoalType(values, g))}
            />
            <AppText variant="caption">{GOAL_HINT[values.goalType]}</AppText>
          </>
        )}

        {values.goalType !== 'binary' ? (
          <View style={{ gap: space.xs }}>
            <AppText style={{ fontWeight: '600' }}>Meta diária</AppText>
            <Stepper
              label="meta diária"
              value={values.target}
              min={1}
              max={MAX_TARGET[values.goalType]}
              step={values.goalType === 'time' ? 5 : 1}
              unit={unitLabel(values.goalType)}
              onChange={(target) => update({ ...values, target })}
            />
            {errors.target ? (
              <AppText variant="caption" style={{ color: colors.danger }}>
                {errors.target}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </Card>

      <Card style={{ gap: space.md }}>
        <AppText style={{ fontWeight: '600' }}>Dias ativos</AppText>
        <SegmentedControl
          accessibilityLabel="Dias ativos"
          options={[
            { value: 'all', label: 'Todos os dias' },
            { value: 'some', label: 'Dias específicos' },
          ]}
          value={values.everyDay ? 'all' : 'some'}
          onChange={(v) => update({ ...values, everyDay: v === 'all' })}
        />
        {!values.everyDay ? (
          <WeekdayPicker value={values.days} onChange={(days) => update({ ...values, days })} />
        ) : null}
        {errors.days ? (
          <AppText variant="caption" style={{ color: colors.danger }}>
            {errors.days}
          </AppText>
        ) : (
          <AppText variant="caption">
            Dias inativos não contam para eficiência nem quebram a sequência.
          </AppText>
        )}
      </Card>

      {notice ? <AppText variant="caption">{notice}</AppText> : null}
      <Button
        kind="primary"
        title={submitting ? 'Salvando…' : submitLabel}
        disabled={submitting}
        onPress={submit}
      />
    </View>
  );
}
