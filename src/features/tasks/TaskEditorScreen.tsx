import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { KeyboardAvoidingView, ScrollView } from 'react-native';

import { Blankslate } from '@/ui/components/Blankslate';
import { useDialog } from '@/ui/dialog/DialogProvider';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space } from '@/ui/theme/tokens';

import { useSettings, useToday } from '../shared/queries';
import { taskToForm, toTaskInput } from './model';
import { useTask, useTaskActions } from './queries';
import { TaskForm } from './TaskForm';

/** Criar (sem id) ou editar (com id) uma tarefa. */
export function TaskEditorScreen({ id }: { id?: string }) {
  const { colors } = useTheme();
  const today = useToday();
  const task = useTask(id);
  const actions = useTaskActions();
  const { data: settings } = useSettings();
  const weekStart = settings?.weekStart ?? 0;
  const dialog = useDialog();
  const onError = dialog.showError('Não foi possível salvar');

  const wrap = (children: React.ReactNode) => (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.canvas }} behavior="height">
      <Stack.Screen options={{ title: id ? 'Editar tarefa' : 'Nova tarefa' }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (!id) {
    return wrap(
      <TaskForm
        today={today}
        weekStart={weekStart}
        submitLabel="Criar tarefa"
        submitting={actions.create.isPending}
        onSubmit={(v) =>
          actions.create.mutate(toTaskInput(v, today), { onSuccess: () => router.back(), onError })
        }
      />,
    );
  }

  if (task.isError) {
    return wrap(
      <Blankslate icon="alert" title="Tarefa não encontrada" description={task.error.message} />,
    );
  }
  if (!task.data) return wrap(null);

  const confirmDelete = async () => {
    const ok = await dialog.confirm({
      title: 'Excluir tarefa?',
      message: `"${task.data.title}" será apagada definitivamente. Isso não pode ser desfeito.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (ok) actions.remove.mutate(id, { onSuccess: () => router.back(), onError });
  };

  return wrap(
    <TaskForm
      key={task.data.id}
      today={today}
      weekStart={weekStart}
      initial={taskToForm(task.data, today)}
      submitLabel="Salvar"
      submitting={actions.update.isPending}
      onSubmit={(v) =>
        actions.update.mutate(
          { id, input: toTaskInput(v, today) },
          { onSuccess: () => router.back(), onError },
        )
      }
      onDelete={confirmDelete}
      completion={{
        done: !!task.data.completedAt,
        busy: actions.complete.isPending || actions.uncomplete.isPending,
        onToggle: () => {
          const done = !!task.data.completedAt;
          (done ? actions.uncomplete : actions.complete).mutate(id, {
            onSuccess: () => {
              void (done
                ? Haptics.selectionAsync()
                : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
              router.back();
            },
            onError,
          });
        },
      }}
    />,
  );
}
