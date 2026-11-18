import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/data/DatabaseProvider';
import type { TaskFilter, TaskInput } from '@/data/repositories/taskRepo';
import type { LocalDate } from '@/domain/types';

import { invalidateUserData } from '../shared/queries';

/** `today` entra na chave: os filtros "hoje"/"atrasadas" mudam na virada do dia. */
export function useTasks(filter: TaskFilter, today: LocalDate) {
  const repos = useRepositories();
  return useQuery({
    queryKey: ['tasks', filter, today] as const,
    queryFn: () => repos.tasks.list(filter),
  });
}

export function useTask(id: string | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: ['task', id] as const,
    queryFn: () => repos.tasks.get(id!),
    enabled: !!id,
  });
}

/** Todas as mutações de tarefa; cada uma invalida o cache (tarefas alimentam o agregado). */
export function useTaskActions() {
  const repos = useRepositories();
  const client = useQueryClient();
  const onSuccess = () => invalidateUserData(client);

  return {
    create: useMutation({ mutationFn: (i: TaskInput) => repos.tasks.create(i), onSuccess }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: TaskInput }) =>
        repos.tasks.update(id, input),
      onSuccess,
    }),
    complete: useMutation({ mutationFn: (id: string) => repos.tasks.complete(id), onSuccess }),
    uncomplete: useMutation({ mutationFn: (id: string) => repos.tasks.uncomplete(id), onSuccess }),
    remove: useMutation({ mutationFn: (id: string) => repos.tasks.remove(id), onSuccess }),
  };
}
