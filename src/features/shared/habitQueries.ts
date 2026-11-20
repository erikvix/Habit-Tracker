import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/data/DatabaseProvider';
import type { LocalDate } from '@/domain/types';

import { invalidateUserData } from './queries';

/** Hábito + versões de meta (formulário de edição). */
export function useHabitWithSchedules(id: string) {
  const repos = useRepositories();
  return useQuery({
    queryKey: ['habitEdit', id] as const,
    queryFn: async () => ({
      habit: await repos.habits.get(id),
      schedules: await repos.habits.schedules(id),
      reminders: (await repos.reminders.listByHabit(id)).map((r) => r.minuteOfDay),
    }),
  });
}

export function useDayCommits(habitId: string, date: LocalDate) {
  const repos = useRepositories();
  return useQuery({
    queryKey: ['dayCommits', habitId, date] as const,
    queryFn: () => repos.commits.listByDay(habitId, date),
  });
}

/** Edição de um dia específico (histórico). */
export function useDayActions(habitId: string, date: LocalDate) {
  const repos = useRepositories();
  const client = useQueryClient();
  const onSuccess = () => invalidateUserData(client);
  return {
    add: useMutation({
      mutationFn: (value: number) => repos.commits.addOnDate(habitId, date, value, 'edit'),
      onSuccess,
    }),
    removeLast: useMutation({
      mutationFn: () => repos.commits.removeLast(habitId, date),
      onSuccess,
    }),
    updateValue: useMutation({
      mutationFn: ({ id, value }: { id: string; value: number }) =>
        repos.commits.updateValue(id, value),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: (id: string) => repos.commits.remove(id), onSuccess }),
  };
}

/** Gestão do hábito: editar (nome/descrição + meta versionada), arquivar, excluir. */
export function useHabitActions(id: string) {
  const repos = useRepositories();
  const client = useQueryClient();
  const onSuccess = () => invalidateUserData(client);
  return {
    save: useMutation({
      mutationFn: async (input: {
        name: string;
        description: string | null;
        dailyTarget: number;
        activeDays: number;
        reminders: number[];
      }) => {
        await repos.habits.update(id, { name: input.name, description: input.description });
        await repos.reminders.setForHabit(id, input.reminders);
        return repos.habits.setSchedule(id, {
          dailyTarget: input.dailyTarget,
          activeDays: input.activeDays,
        });
      },
      onSuccess,
    }),
    archive: useMutation({ mutationFn: () => repos.habits.archive(id), onSuccess }),
    unarchive: useMutation({ mutationFn: () => repos.habits.unarchive(id), onSuccess }),
    remove: useMutation({ mutationFn: () => repos.habits.remove(id), onSuccess }),
  };
}
