import { router } from 'expo-router';
import { KeyboardAvoidingView, ScrollView } from 'react-native';

import { createScheduleResolver } from '@/domain/schedule';
import { Blankslate } from '@/ui/components/Blankslate';
import { useDialog } from '@/ui/dialog/DialogProvider';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space } from '@/ui/theme/tokens';

import { useHabitActions, useHabitWithSchedules } from '../shared/habitQueries';
import { ensurePermission } from '../notifications/service';
import { useToday } from '../shared/queries';
import { HabitForm } from './HabitForm';
import { habitToForm, toHabitInput } from './model';

export const SCHEDULE_NOTICE =
  'Mudanças de meta e dias valem a partir de hoje; dias anteriores mantêm a configuração da época.';

export function HabitEditScreen({ id }: { id: string }) {
  const { colors } = useTheme();
  const today = useToday();
  const data = useHabitWithSchedules(id);
  const { save } = useHabitActions(id);
  const dialog = useDialog();

  const wrap = (children: React.ReactNode) => (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.canvas }} behavior="height">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (data.isError) {
    return wrap(<Blankslate icon="alert" title="Erro" description={data.error.message} />);
  }
  if (!data.data) return wrap(null);

  const { habit, schedules, reminders } = data.data;
  const current = createScheduleResolver(schedules)(today) ?? schedules.at(-1);

  return wrap(
    <HabitForm
      key={habit.id}
      initial={habitToForm(habit, current, reminders)}
      requestPermission={ensurePermission}
      lockGoalType
      notice={SCHEDULE_NOTICE}
      submitLabel="Salvar alterações"
      submitting={save.isPending}
      onSubmit={(values) => {
        const input = toHabitInput(values);
        save.mutate(
          {
            name: input.name,
            description: input.description,
            dailyTarget: input.dailyTarget,
            activeDays: input.activeDays,
            reminders: values.reminders,
          },
          {
            onSuccess: () => router.back(),
            onError: dialog.showError('Não foi possível salvar'),
          },
        );
      }}
    />,
  );
}
