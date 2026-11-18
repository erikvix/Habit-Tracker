import { habitLevel, isGoalMet } from './level';
import {
  createScheduleResolver,
  isActiveDay,
  targetForDate,
  type ScheduleResolver,
} from './schedule';
import type { HabitHistory, Level, LocalDate } from './types';

export interface HabitDay {
  date: LocalDate;
  /** Conta para eficiência/streak. */
  active: boolean;
  /** Meta vigente para esse dia (undefined se o hábito não tem nenhuma versão). */
  target: number | undefined;
  progress: number;
  level: Level;
  /** Meta cumprida (vale também em dia inativo: conta como item feito no agregado). */
  met: boolean;
}

/** Avaliador de dias de um hábito, com o resolver de metas pré-computado. */
export function createHabitEvaluator(history: HabitHistory) {
  const { habit, schedules, progress } = history;
  const resolve: ScheduleResolver = createScheduleResolver(schedules);
  const goalType = habit.goalType;

  return (date: LocalDate): HabitDay => {
    const p = progress.get(date) ?? 0;
    const target = targetForDate(resolve, schedules, date);
    const t = target ?? 1;
    return {
      date,
      active: isActiveDay(habit, resolve, date),
      target,
      progress: p,
      level: habitLevel(p, t, goalType),
      met: isGoalMet(p, t, goalType),
    };
  };
}

export type HabitEvaluator = ReturnType<typeof createHabitEvaluator>;
