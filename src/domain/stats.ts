import type { LocalDate } from './types';

/** Soma valores de um mapa por data dentro de [from, to]. Serve para commits e minutos. */
export function sumInRange(
  byDate: ReadonlyMap<LocalDate, number>,
  from: LocalDate,
  to: LocalDate,
): number {
  let total = 0;
  for (const [date, value] of byDate) {
    if (date >= from && date <= to) total += value;
  }
  return total;
}
