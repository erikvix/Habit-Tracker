import { addDays, endOfMonth, startOfMonth, startOfWeek } from './localDate';
import type { LocalDate, MonthKey, Weekday } from './types';

/**
 * Grade de um mês para o calendário: semanas (linhas) de 7 posições.
 * Posições fora do mês são `null` (o calendário não mostra dias vizinhos).
 */
export function buildMonthGrid(month: MonthKey, weekStart: Weekday = 0): (LocalDate | null)[][] {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const weeks: (LocalDate | null)[][] = [];
  let cursor = startOfWeek(first, weekStart);
  while (cursor <= last) {
    const week: (LocalDate | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(cursor, i);
      week.push(d >= first && d <= last ? d : null);
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

/** Cabeçalho dos dias da semana na ordem da grade. */
export function weekdayOrder(weekStart: Weekday = 0): Weekday[] {
  return Array.from({ length: 7 }, (_, i) => ((weekStart + i) % 7) as Weekday);
}
