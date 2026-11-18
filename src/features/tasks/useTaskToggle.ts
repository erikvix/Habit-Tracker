import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

import type { TaskRecord } from '@/data/repositories/taskRepo';

import { useTaskActions } from './queries';

/** Concluir/reabrir com vibração e erro visível. Compartilhado entre Tarefas e Hoje. */
export function useTaskToggle() {
  const actions = useTaskActions();
  const busy = actions.complete.isPending || actions.uncomplete.isPending;
  const onError = (e: Error) => Alert.alert('Não foi possível salvar', e.message);

  const toggle = (task: TaskRecord) => {
    if (task.completedAt) {
      actions.uncomplete.mutate(task.id, {
        onSuccess: () => void Haptics.selectionAsync(),
        onError,
      });
    } else {
      actions.complete.mutate(task.id, {
        onSuccess: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        onError,
      });
    }
  };
  return { toggle, busy, actions };
}
