import { createHabitEvaluator } from './habitDay';
import { addDays, eachDay, minDate } from './localDate';
import type { HabitHistory, LocalDate } from './types';

export interface Streaks {
  /** Dias ativos consecutivos cumpridos até hoje. */
  current: number;
  /** Maior sequência de todo o histórico. */
  longest: number;
}

/**
 * Regras:
 * - Só dias ativos contam; dias inativos são pulados (não somam nem quebram).
 * - Um dia ativo não cumprido quebra a sequência…
 * - …exceto hoje: se ainda não foi cumprido, está "pendente" e não quebra.
 * - Cada dia é julgado pela meta vigente nele.
 * - Hábito arquivado: a contagem para na véspera do arquivamento.
 */
export function computeStreaks(history: HabitHistory, today: LocalDate): Streaks {
  const { habit } = history;
  const evaluate = createHabitEvaluator(history);
  const end = habit.archivedAt ? minDate(today, addDays(habit.archivedAt, -1)) : today;

  let run = 0;
  let longest = 0;
  if (habit.startDate <= end) {
    for (const date of eachDay(habit.startDate, end)) {
      const day = evaluate(date);
      if (!day.active) continue;
      if (day.met) {
        run++;
        if (run > longest) longest = run;
      } else if (date !== today) {
        run = 0;
      }
    }
  }
  return { current: run, longest };
}
