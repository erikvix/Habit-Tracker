import { weekday } from './localDate';
import type { Habit, HabitSchedule, LocalDate, Weekday } from './types';

export const ALL_DAYS = 0b1111111;

export function weekdayBit(day: Weekday): number {
  return 1 << day;
}

export function maskFromWeekdays(days: readonly Weekday[]): number {
  return days.reduce<number>((mask, d) => mask | weekdayBit(d), 0);
}

export function weekdaysFromMask(mask: number): Weekday[] {
  return ([0, 1, 2, 3, 4, 5, 6] as const).filter((d) => (mask & weekdayBit(d)) !== 0);
}

export function isWeekdayInMask(mask: number, day: Weekday): boolean {
  return (mask & weekdayBit(day)) !== 0;
}

export type ScheduleResolver = (date: LocalDate) => HabitSchedule | undefined;

/**
 * Devolve a versão de meta vigente em cada data: a de maior `effectiveFrom` ≤ data.
 * Datas anteriores à primeira versão → undefined.
 */
export function createScheduleResolver(schedules: readonly HabitSchedule[]): ScheduleResolver {
  const sorted = [...schedules].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return (date) => {
    let lo = 0;
    let hi = sorted.length - 1;
    let found: HabitSchedule | undefined;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const s = sorted[mid]!;
      if (s.effectiveFrom <= date) {
        found = s;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return found;
  };
}

/**
 * Meta usada para *colorir* um dia. Para commits anteriores à primeira versão
 * (não deveria ocorrer, mas o domínio não confia no banco), usa a versão mais antiga.
 */
export function targetForDate(
  resolve: ScheduleResolver,
  schedules: readonly HabitSchedule[],
  date: LocalDate,
): number | undefined {
  const s = resolve(date);
  if (s) return s.dailyTarget;
  let earliest: HabitSchedule | undefined;
  for (const x of schedules) {
    if (!earliest || x.effectiveFrom < earliest.effectiveFrom) earliest = x;
  }
  return earliest?.dailyTarget;
}

/**
 * Um dia é ativo (conta para eficiência e streak) quando:
 * - está em [startDate, archivedAt), e
 * - existe versão de meta vigente, e
 * - o dia da semana está marcado nessa versão.
 */
export function isActiveDay(habit: Habit, resolve: ScheduleResolver, date: LocalDate): boolean {
  if (date < habit.startDate) return false;
  if (habit.archivedAt && date >= habit.archivedAt) return false;
  const s = resolve(date);
  return s !== undefined && isWeekdayInMask(s.activeDays, weekday(date));
}
