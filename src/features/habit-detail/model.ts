import { buildContributionGrid, type MonthLabel } from '@/domain/contributionGrid';
import { createHabitEvaluator } from '@/domain/habitDay';
import type { HabitHistory, Level, LocalDate, Weekday } from '@/domain/types';

export interface GraphCell {
  date: LocalDate;
  level: Level;
  /** Dia inativo sem commit ("descanso"): desenhado só com contorno. */
  rest: boolean;
  /** Depois de hoje: não desenhado. */
  future: boolean;
}

export interface GraphData {
  weeks: GraphCell[][];
  monthLabels: MonthLabel[];
  start: LocalDate;
  end: LocalDate;
}

/** Cruza o histórico do hábito com a grade de 53 semanas terminando hoje. */
export function habitGraphData(
  history: HabitHistory,
  today: LocalDate,
  weekStart: Weekday = 0,
): GraphData {
  const grid = buildContributionGrid(today, 53, weekStart);
  const evaluate = createHabitEvaluator(history);
  const weeks = grid.weeks.map((col) =>
    col.map((cell): GraphCell => {
      if (cell.future) return { date: cell.date, level: 0, rest: false, future: true };
      const d = evaluate(cell.date);
      // Antes do início do hábito não é "descanso": é só vazio.
      const rest = !d.active && d.progress === 0 && cell.date >= history.habit.startDate;
      return { date: cell.date, level: d.level, rest, future: false };
    }),
  );
  return { weeks, monthLabels: grid.monthLabels, start: grid.start, end: grid.end };
}
