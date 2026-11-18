import { createHabitEvaluator, type HabitEvaluator } from './habitDay';
import {
  addDays,
  eachDay,
  eachMonth,
  endOfMonth,
  maxDate,
  minDate,
  startOfMonth,
} from './localDate';
import type { HabitHistory, LocalDate, MonthKey } from './types';

export interface MonthEfficiency {
  month: MonthKey;
  /** Denominador: dias ativos considerados. */
  activeDays: number;
  /** Numerador: dias ativos com meta cumprida. */
  metDays: number;
  /** metDays / activeDays em [0, 1]; null quando não há dia ativo a considerar. */
  efficiency: number | null;
}

/**
 * Eficiência mensal = dias ativos com meta cumprida / dias ativos no mês.
 *
 * Janela considerada: [max(início do mês, startDate), min(fim do mês, hoje, véspera do arquivamento)].
 * Hoje entra no denominador **só se a meta já foi cumprida** — um dia em andamento
 * não derruba a eficiência. Meta trocada no meio do mês: cada dia usa a sua versão.
 */
export function monthEfficiency(
  history: HabitHistory,
  month: MonthKey,
  today: LocalDate,
  evaluate: HabitEvaluator = createHabitEvaluator(history),
): MonthEfficiency {
  const { habit } = history;
  const from = maxDate(startOfMonth(month), habit.startDate);
  let to = minDate(endOfMonth(month), today);
  if (habit.archivedAt) to = minDate(to, addDays(habit.archivedAt, -1));

  let activeDays = 0;
  let metDays = 0;
  if (from <= to) {
    for (const date of eachDay(from, to)) {
      const day = evaluate(date);
      if (!day.active) continue;
      if (date === today && !day.met) continue; // pendente
      activeDays++;
      if (day.met) metDays++;
    }
  }
  return { month, activeDays, metDays, efficiency: activeDays === 0 ? null : metDays / activeDays };
}

/** Série mês a mês (inclusive nas pontas), para o gráfico de eficiência. */
export function efficiencySeries(
  history: HabitHistory,
  fromMonth: MonthKey,
  toMonth: MonthKey,
  today: LocalDate,
): MonthEfficiency[] {
  const evaluate = createHabitEvaluator(history);
  return eachMonth(fromMonth, toMonth).map((m) => monthEfficiency(history, m, today, evaluate));
}

/** Eficiência em % inteiro para exibição ("—" fica a cargo da UI quando null). */
export function efficiencyPercent(e: number | null): number | null {
  return e === null ? null : Math.round(e * 100);
}
