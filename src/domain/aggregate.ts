import { createHabitEvaluator } from './habitDay';
import { relativeLevel } from './level';
import type { HabitHistory, Level, LocalDate, Task } from './types';

export interface AggregateDay {
  date: LocalDate;
  /** Itens concluídos: hábitos com meta cumprida + tarefas concluídas. */
  completed: number;
  level: Level;
}

/**
 * Contagem de itens concluídos por dia em [from, to].
 * - Hábito: conta 1 no dia em que a meta (vigente naquele dia) foi cumprida —
 *   inclusive em dia inativo (foi feito, então conta). Arquivado conta até a véspera
 *   do arquivamento; o histórico anterior permanece.
 * - Tarefa: conta 1 no dia lógico da conclusão.
 */
export function completedByDate(
  histories: readonly HabitHistory[],
  tasks: readonly Task[],
  from: LocalDate,
  to: LocalDate,
): Map<LocalDate, number> {
  const counts = new Map<LocalDate, number>();
  const inc = (d: LocalDate) => counts.set(d, (counts.get(d) ?? 0) + 1);

  for (const history of histories) {
    const evaluate = createHabitEvaluator(history);
    const archivedAt = history.habit.archivedAt;
    for (const [date, value] of history.progress) {
      if (value <= 0 || date < from || date > to) continue;
      if (archivedAt && date >= archivedAt) continue;
      if (evaluate(date).met) inc(date);
    }
  }
  for (const task of tasks) {
    const d = task.completedLocalDate;
    if (d && d >= from && d <= to) inc(d);
  }
  return counts;
}

/** Níveis do gráfico geral: relativos ao maior dia do período (como o GitHub). */
export function aggregateLevels(
  counts: ReadonlyMap<LocalDate, number>,
): Map<LocalDate, AggregateDay> {
  let max = 0;
  for (const v of counts.values()) if (v > max) max = v;
  const out = new Map<LocalDate, AggregateDay>();
  for (const [date, completed] of counts) {
    out.set(date, { date, completed, level: relativeLevel(completed, max) });
  }
  return out;
}
