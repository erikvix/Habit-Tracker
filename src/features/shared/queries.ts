import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useRepositories } from '@/data/DatabaseProvider';
import type { HabitInput } from '@/data/repositories/habitRepo';
import { defaultSettings } from '@/data/repositories/settingsRepo';
import { addDays, toLocalDate } from '@/domain/localDate';
import type { LocalDate } from '@/domain/types';

import { msUntilNextRollover } from './model';

/** Chaves de query. Tudo que não é ajuste depende de dados do usuário. */
export const qk = {
  settings: ['settings'] as const,
  board: (today: LocalDate) => ['board', today] as const,
  habits: (includeArchived: boolean) => ['habits', includeArchived] as const,
  habit: (id: string) => ['habit', id] as const,
  commitCounts: (id: string, from: LocalDate, to: LocalDate) =>
    ['commitCounts', id, from, to] as const,
};

/** Dados locais: invalidar tudo (exceto ajustes) é barato e evita esquecer uma chave. */
export function invalidateUserData(client: QueryClient) {
  return client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'settings' });
}

export function useSettings() {
  const repos = useRepositories();
  return useQuery({ queryKey: qk.settings, queryFn: () => repos.settings.getAll() });
}

/**
 * Dia lógico atual. Recalcula quando o app volta ao primeiro plano e na hora da
 * virada (com o app aberto de um dia para o outro).
 */
export function useToday(): LocalDate {
  const { data: settings = defaultSettings } = useSettings();
  const hour = settings.rolloverHour;
  const [today, setToday] = useState(() => toLocalDate(new Date(), hour));

  useEffect(() => {
    const refresh = () => setToday(toLocalDate(new Date(), hour));
    refresh();
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          refresh();
          schedule();
        },
        msUntilNextRollover(new Date(), hour) + 1000,
      );
    };
    schedule();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [hour]);

  return today;
}

/** Hábitos não arquivados com histórico dos últimos 7 dias (tela Hoje). */
export function useBoard(today: LocalDate) {
  const repos = useRepositories();
  return useQuery({
    queryKey: qk.board(today),
    queryFn: async () => {
      const histories = await repos.habits.histories({ from: addDays(today, -6), to: today });
      return histories.filter((h) => !h.habit.archivedAt);
    },
  });
}

export function useHabitList(includeArchived = false) {
  const repos = useRepositories();
  return useQuery({
    queryKey: qk.habits(includeArchived),
    queryFn: async () => {
      const habits = await repos.habits.list({ includeArchived });
      return Promise.all(
        habits.map(async (habit) => ({ habit, schedules: await repos.habits.schedules(habit.id) })),
      );
    },
  });
}

/** Histórico completo de um hábito (detalhe / grid). */
export function useHabitHistory(id: string) {
  const repos = useRepositories();
  return useQuery({ queryKey: qk.habit(id), queryFn: () => repos.habits.history(id) });
}

export function useCommitCounts(id: string, from: LocalDate, to: LocalDate) {
  const repos = useRepositories();
  return useQuery({
    queryKey: qk.commitCounts(id, from, to),
    queryFn: () => repos.commits.countByDate(id, from, to),
  });
}

export function useCreateHabit() {
  const repos = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: HabitInput) => repos.habits.create(input),
    onSuccess: () => invalidateUserData(client),
  });
}

/** Commit de hoje e desfazer (−1). */
export function useCommitActions() {
  const repos = useRepositories();
  const client = useQueryClient();
  const onSuccess = () => invalidateUserData(client);

  const commit = useMutation({
    mutationFn: ({ habitId, value }: { habitId: string; value?: number }) =>
      repos.commits.add(habitId, { value, source: value && value > 1 ? 'manual' : 'quick' }),
    onSuccess,
  });
  const undo = useMutation({
    mutationFn: (habitId: string) => repos.commits.removeLast(habitId),
    onSuccess,
  });
  return { commit, undo };
}
