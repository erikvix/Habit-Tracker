import { ALL_DAYS } from '../schedule';
import type { GoalType, HabitHistory, LocalDate } from '../types';

interface Opts {
  goalType?: GoalType;
  startDate?: LocalDate;
  archivedAt?: LocalDate | null;
  /** [effectiveFrom, dailyTarget, activeDaysMask?] */
  schedules?: [LocalDate, number, number?][];
  progress?: Record<LocalDate, number>;
  name?: string;
}

export function history(o: Opts = {}): HabitHistory {
  const startDate = o.startDate ?? '2026-01-01';
  const schedules = (o.schedules ?? [[startDate, 1]]).map(([effectiveFrom, dailyTarget, mask]) => ({
    habitId: 'h',
    effectiveFrom,
    dailyTarget,
    activeDays: mask ?? ALL_DAYS,
  }));
  return {
    habit: {
      id: 'h',
      name: o.name ?? 'Hábito',
      goalType: o.goalType ?? 'binary',
      startDate,
      archivedAt: o.archivedAt ?? null,
    },
    schedules,
    progress: new Map(Object.entries(o.progress ?? {})),
  };
}

/** Marca `value` em todos os dias de from..to (inclusive). */
export function fill(from: LocalDate, to: LocalDate, value: number): Record<LocalDate, number> {
  const out: Record<LocalDate, number> = {};
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end) {
    out[d.toISOString().slice(0, 10)] = value;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
