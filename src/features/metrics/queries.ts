import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/data/DatabaseProvider';
import { addDays, startOfWeek } from '@/domain/localDate';
import type { LocalDate, Weekday } from '@/domain/types';

/**
 * Dados da aba Geral: histórico completo de todos os hábitos (o ranking pode navegar
 * para meses antigos) e tarefas concluídas no período do grid. Volume pequeno (uso pessoal).
 */
export function useOverview(today: LocalDate, weekStart: Weekday) {
  const repos = useRepositories();
  const gridStart = addDays(startOfWeek(today, weekStart), -7 * 52);
  return useQuery({
    queryKey: ['overview', today, weekStart] as const,
    queryFn: async () => ({
      histories: await repos.habits.histories({ from: '1970-01-01', to: today }),
      tasks: await repos.tasks.completedBetween(gridStart, today),
    }),
  });
}
