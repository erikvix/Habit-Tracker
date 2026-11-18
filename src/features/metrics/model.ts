import { aggregateLevels, completedByDate } from '@/domain/aggregate';
import { buildContributionGrid, type MonthLabel } from '@/domain/contributionGrid';
import { efficiencySeries, monthEfficiency, type MonthEfficiency } from '@/domain/efficiency';
import { addMonths, monthKey } from '@/domain/localDate';
import { rankByEfficiency, type RankedHabit } from '@/domain/ranking';
import { sumInRange } from '@/domain/stats';
import { computeStreaks, type Streaks } from '@/domain/streaks';
import type { HabitHistory, Level, LocalDate, MonthKey, Task, Weekday } from '@/domain/types';

import type { GraphCell } from '../habit-detail/model';

/** Eficiência → nível de cor (mesma escala do contribution graph). null/0 → 0. */
export function efficiencyLevel(e: number | null): Level {
  if (e === null || e <= 0) return 0;
  if (e < 0.25) return 1;
  if (e < 0.5) return 2;
  if (e < 1) return 3;
  return 4;
}

export interface HabitStats {
  streaks: Streaks;
  month: MonthEfficiency;
  /** 12 meses terminando no mês atual (mais antigo primeiro). */
  series: MonthEfficiency[];
  /** Soma de minutos em [from, today] (só faz sentido para hábitos de tempo). */
  minutes: number;
}

export function habitStats(
  history: HabitHistory,
  today: LocalDate,
  selectedMonth: MonthKey,
  yearFrom: LocalDate,
): HabitStats {
  const current = monthKey(today);
  return {
    streaks: computeStreaks(history, today),
    month: monthEfficiency(history, selectedMonth, today),
    series: efficiencySeries(history, addMonths(current, -11), current, today),
    minutes: sumInRange(history.progress, yearFrom, today),
  };
}

// ---------- Visão geral ----------

export interface OverviewDay {
  habits: number;
  tasks: number;
}

export interface OverviewData {
  weeks: GraphCell[][];
  monthLabels: MonthLabel[];
  start: LocalDate;
  /** Itens concluídos no período do grid. */
  total: number;
  breakdown: Map<LocalDate, OverviewDay>;
}

/** Grid agregado: hábitos com meta cumprida + tarefas concluídas, nível relativo ao maior dia. */
export function overviewData(
  histories: readonly HabitHistory[],
  tasks: readonly Task[],
  today: LocalDate,
  weekStart: Weekday = 0,
): OverviewData {
  const grid = buildContributionGrid(today, 53, weekStart);
  const from = grid.start;
  const habitCounts = completedByDate(histories, [], from, today);
  const taskCounts = completedByDate([], tasks, from, today);
  const totals = completedByDate(histories, tasks, from, today);
  const levels = aggregateLevels(totals);

  const breakdown = new Map<LocalDate, OverviewDay>();
  let total = 0;
  for (const [date, n] of totals) {
    total += n;
    breakdown.set(date, { habits: habitCounts.get(date) ?? 0, tasks: taskCounts.get(date) ?? 0 });
  }

  const weeks = grid.weeks.map((col) =>
    col.map((c): GraphCell => ({
      date: c.date,
      level: c.future ? 0 : (levels.get(c.date)?.level ?? 0),
      rest: false,
      future: c.future,
    })),
  );
  return { weeks, monthLabels: grid.monthLabels, start: from, total, breakdown };
}

/** "3 itens (2 hábitos, 1 tarefa)" / "nada concluído". */
export function overviewDayText(d: OverviewDay | undefined): string {
  const habits = d?.habits ?? 0;
  const tasks = d?.tasks ?? 0;
  const total = habits + tasks;
  if (total === 0) return 'nada concluído';
  const parts: string[] = [];
  if (habits) parts.push(`${habits} ${habits === 1 ? 'hábito' : 'hábitos'}`);
  if (tasks) parts.push(`${tasks} ${tasks === 1 ? 'tarefa' : 'tarefas'}`);
  return `${total} ${total === 1 ? 'item' : 'itens'} (${parts.join(', ')})`;
}

/** Ranking do mês entre hábitos não arquivados. */
export function rankingFor(
  histories: readonly HabitHistory[],
  month: MonthKey,
  today: LocalDate,
): RankedHabit[] {
  return rankByEfficiency(
    histories
      .filter((h) => !h.habit.archivedAt)
      .map((h) => ({
        habitId: h.habit.id,
        name: h.habit.name,
        month: monthEfficiency(h, month, today),
      })),
  );
}

/** Seletor de mês: mesma janela das barras (mês atual e os 11 anteriores). */
export function minSelectableMonth(today: LocalDate): MonthKey {
  return addMonths(monthKey(today), -11);
}
