import { addDays, monthKey, startOfWeek } from './localDate';
import type { LocalDate, MonthKey, Weekday } from './types';

export interface GridCell {
  date: LocalDate;
  /** Linha 0–6 a partir do primeiro dia da semana. */
  row: number;
  /** Depois de `end`: a UI não desenha (como o GitHub na semana corrente). */
  future: boolean;
}

export interface MonthLabel {
  month: MonthKey;
  /** Coluna (semana) onde o rótulo começa. */
  column: number;
}

export interface ContributionGrid {
  /** Colunas = semanas, da mais antiga para a atual; cada uma com 7 células. */
  weeks: GridCell[][];
  monthLabels: MonthLabel[];
  start: LocalDate;
  end: LocalDate;
}

/**
 * Grade de `weeks` semanas terminando na semana de `end` (padrão 53 ≈ 12 meses,
 * como o perfil do GitHub). Semana começa em `weekStart` (0 = domingo).
 *
 * Rótulo de mês: na primeira coluna cujo primeiro dia pertence a um mês diferente
 * da coluna anterior — exceto se a coluna 0 não começa no dia 1 e o próximo
 * rótulo vem logo em seguida (evita "Jan Fev" encavalados no canto).
 */
export function buildContributionGrid(
  end: LocalDate,
  weeks = 53,
  weekStart: Weekday = 0,
): ContributionGrid {
  const start = addDays(startOfWeek(end, weekStart), -7 * (weeks - 1));
  const columns: GridCell[][] = [];
  const labels: MonthLabel[] = [];

  for (let w = 0; w < weeks; w++) {
    const col: GridCell[] = [];
    for (let r = 0; r < 7; r++) {
      const date = addDays(start, w * 7 + r);
      col.push({ date, row: r, future: date > end });
    }
    columns.push(col);

    const first = col[0]!.date;
    const prev = w > 0 ? columns[w - 1]![0]!.date : undefined;
    if (prev === undefined || monthKey(first) !== monthKey(prev)) {
      labels.push({ month: monthKey(first), column: w });
    }
  }

  // Remove o rótulo inicial se o seguinte estiver a menos de 3 colunas (não cabe).
  if (labels.length > 1 && labels[1]!.column - labels[0]!.column < 3) labels.shift();

  return { weeks: columns, monthLabels: labels, start, end };
}
