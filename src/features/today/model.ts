import { createHabitEvaluator, type HabitDay } from '@/domain/habitDay';
import { addDays } from '@/domain/localDate';
import type { HabitHistory, LocalDate } from '@/domain/types';

export interface TodayItem {
  history: HabitHistory;
  /** Avaliação de hoje. */
  day: HabitDay;
  /** Últimos 7 dias, do mais antigo até hoje. */
  week: HabitDay[];
}

export interface TodayList {
  /** Hábitos com hoje como dia ativo. */
  active: TodayItem[];
  /** Hábitos não arquivados cujo dia de hoje é inativo (ainda dá para commitar). */
  other: TodayItem[];
}

/** Separa os hábitos do dia, preservando a ordem do usuário. Arquivados ficam de fora. */
export function buildTodayList(histories: readonly HabitHistory[], today: LocalDate): TodayList {
  const active: TodayItem[] = [];
  const other: TodayItem[] = [];
  for (const history of histories) {
    if (history.habit.archivedAt && history.habit.archivedAt <= today) continue;
    const evaluate = createHabitEvaluator(history);
    const week = Array.from({ length: 7 }, (_, i) => evaluate(addDays(today, i - 6)));
    const item: TodayItem = { history, day: week[6]!, week };
    (item.day.active ? active : other).push(item);
  }
  return { active, other };
}

/** Resumo do topo da tela Hoje: quantos hábitos ativos já bateram a meta. */
export function todaySummary(list: TodayList): { done: number; total: number } {
  return { done: list.active.filter((i) => i.day.met).length, total: list.active.length };
}
