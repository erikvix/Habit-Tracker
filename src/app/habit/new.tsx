import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert, KeyboardAvoidingView, ScrollView } from 'react-native';

import { HabitForm } from '@/features/habit-form/HabitForm';
import { toHabitInput } from '@/features/habit-form/model';
import { useCreateHabit } from '@/features/shared/queries';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space } from '@/ui/theme/tokens';

export default function NewHabitScreen() {
  const { colors } = useTheme();
  const create = useCreateHabit();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.canvas }} behavior="height">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
      >
        <HabitForm
          submitLabel="Criar hábito"
          submitting={create.isPending}
          onSubmit={(values) =>
            create.mutate(toHabitInput(values), {
              onSuccess: () => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.back();
              },
              onError: (e) => Alert.alert('Não foi possível criar', e.message),
            })
          }
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
