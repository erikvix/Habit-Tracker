import type { GoalType, Habit, HabitHistory, HabitSchedule, LocalDate } from '@/domain/types';

import { NotFoundError, ValidationError, type RepoContext } from '../context';
import type { SqlExecutor } from '../driver';
import type { SettingsRepo } from './settingsRepo';

interface HabitRow {
  id: string;
  name: string;
  description: string | null;
  goal_type: GoalType;
  start_date: string;
  sort_order: number;
  archived_at: string | null;
}

interface ScheduleRow {
  habit_id: string;
  effective_from: string;
  daily_target: number;
  active_days: number;
}

export interface HabitRecord extends Habit {
  sortOrder: number;
}

export interface HabitInput {
  name: string;
  description?: string | null;
  goalType: GoalType;
  /** Ignorado para binário (sempre 1). */
  dailyTarget: number;
  activeDays: number;
}

const toHabit = (r: HabitRow): HabitRecord => ({
  id: r.id,
  name: r.name,
  description: r.description,
  goalType: r.goal_type,
  startDate: r.start_date,
  archivedAt: r.archived_at,
  sortOrder: r.sort_order,
});

const toSchedule = (r: ScheduleRow): HabitSchedule => ({
  habitId: r.habit_id,
  effectiveFrom: r.effective_from,
  dailyTarget: r.daily_target,
  activeDays: r.active_days,
});

export function normalizeName(name: string): string {
  const n = name.trim();
  if (!n) throw new ValidationError('Nome é obrigatório');
  if (n.length > 80) throw new ValidationError('Nome deve ter no máximo 80 caracteres');
  return n;
}

function normalizeTarget(goalType: GoalType, target: number): number {
  if (goalType === 'binary') return 1;
  if (!Number.isInteger(target) || target < 1) {
    throw new ValidationError('Meta diária deve ser um inteiro ≥ 1');
  }
  if (target > (goalType === 'time' ? 1440 : 1000)) {
    throw new ValidationError('Meta diária fora do limite');
  }
  return target;
}

function normalizeActiveDays(mask: number): number {
  if (!Number.isInteger(mask) || mask < 1 || mask > 127) {
    throw new ValidationError('Selecione pelo menos um dia ativo');
  }
  return mask;
}

const GOAL_TYPES: readonly GoalType[] = ['binary', 'count', 'time'];

export function createHabitRepo(ctx: RepoContext, settings: SettingsRepo) {
  const { db, clock, newId } = ctx;

  async function getRow(exec: SqlExecutor, id: string): Promise<HabitRecord> {
    const row = await exec.get<HabitRow>('SELECT * FROM habit WHERE id = ?', [id]);
    if (!row) throw new NotFoundError(`Hábito ${id} não encontrado`);
    return toHabit(row);
  }

  async function schedulesOf(exec: SqlExecutor, id: string): Promise<HabitSchedule[]> {
    const rows = await exec.all<ScheduleRow>(
      'SELECT * FROM habit_schedule WHERE habit_id = ? ORDER BY effective_from',
      [id],
    );
    return rows.map(toSchedule);
  }

  return {
    get: (id: string) => getRow(db, id),

    async list({ includeArchived = false } = {}): Promise<HabitRecord[]> {
      const rows = await db.all<HabitRow>(
        `SELECT * FROM habit ${includeArchived ? '' : 'WHERE archived_at IS NULL'}
         ORDER BY sort_order, created_at`,
      );
      return rows.map(toHabit);
    },

    schedules: (id: string) => schedulesOf(db, id),

    /** Cria o hábito e a primeira versão da meta (vigente a partir de hoje). */
    async create(input: HabitInput): Promise<HabitRecord> {
      if (!GOAL_TYPES.includes(input.goalType)) throw new ValidationError('Tipo de meta inválido');
      const name = normalizeName(input.name);
      const target = normalizeTarget(input.goalType, input.dailyTarget);
      const days = normalizeActiveDays(input.activeDays);
      const now = clock.now().toISOString();
      const id = newId();

      await db.transaction(async (tx) => {
        const today = await settings.today();
        const next = await tx.get<{ n: number }>(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM habit',
        );
        await tx.run(
          `INSERT INTO habit (id, name, description, goal_type, start_date, sort_order,
                              archived_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
          [
            id,
            name,
            input.description?.trim() || null,
            input.goalType,
            today,
            next?.n ?? 0,
            now,
            now,
          ],
        );
        await tx.run(
          `INSERT INTO habit_schedule (id, habit_id, effective_from, daily_target, active_days)
           VALUES (?, ?, ?, ?, ?)`,
          [newId(), id, today, target, days],
        );
      });
      return getRow(db, id);
    },

    async update(id: string, patch: { name?: string; description?: string | null }) {
      const current = await getRow(db, id);
      const name = patch.name === undefined ? current.name : normalizeName(patch.name);
      const description =
        patch.description === undefined ? current.description : patch.description?.trim() || null;
      await db.run('UPDATE habit SET name = ?, description = ?, updated_at = ? WHERE id = ?', [
        name,
        description ?? null,
        clock.now().toISOString(),
        id,
      ]);
    },

    /**
     * Versiona meta/dias ativos a partir de hoje:
     * - igual à versão vigente → nada muda;
     * - já existe versão com vigência hoje → sobrescreve;
     * - senão → nova versão.
     * @returns true se algo mudou.
     */
    async setSchedule(
      id: string,
      input: { dailyTarget: number; activeDays: number },
    ): Promise<boolean> {
      return db.transaction(async (tx) => {
        const habit = await getRow(tx, id);
        const target = normalizeTarget(habit.goalType, input.dailyTarget);
        const days = normalizeActiveDays(input.activeDays);
        const today = await settings.today();

        const current = await tx.get<ScheduleRow>(
          `SELECT * FROM habit_schedule WHERE habit_id = ? AND effective_from <= ?
           ORDER BY effective_from DESC LIMIT 1`,
          [id, today],
        );
        if (current && current.daily_target === target && current.active_days === days) {
          return false;
        }
        if (current?.effective_from === today) {
          await tx.run(
            `UPDATE habit_schedule SET daily_target = ?, active_days = ?
             WHERE habit_id = ? AND effective_from = ?`,
            [target, days, id, today],
          );
        } else {
          await tx.run(
            `INSERT INTO habit_schedule (id, habit_id, effective_from, daily_target, active_days)
             VALUES (?, ?, ?, ?, ?)`,
            [newId(), id, today, target, days],
          );
        }
        await tx.run('UPDATE habit SET updated_at = ? WHERE id = ?', [
          clock.now().toISOString(),
          id,
        ]);
        return true;
      });
    },

    async archive(id: string): Promise<void> {
      await getRow(db, id);
      const today = await settings.today();
      await db.run('UPDATE habit SET archived_at = ?, updated_at = ? WHERE id = ?', [
        today,
        clock.now().toISOString(),
        id,
      ]);
    },

    async unarchive(id: string): Promise<void> {
      await getRow(db, id);
      await db.run('UPDATE habit SET archived_at = NULL, updated_at = ? WHERE id = ?', [
        clock.now().toISOString(),
        id,
      ]);
    },

    /** Exclusão definitiva: commits, versões, lembretes e cronômetro vão em cascata. */
    async remove(id: string): Promise<void> {
      const r = await db.run('DELETE FROM habit WHERE id = ?', [id]);
      if (r.changes === 0) throw new NotFoundError(`Hábito ${id} não encontrado`);
    },

    /** Histórico pronto para o domínio. Sem período → todo o histórico. */
    async history(id: string, range?: { from: LocalDate; to: LocalDate }): Promise<HabitHistory> {
      const habit = await getRow(db, id);
      const schedules = await schedulesOf(db, id);
      const rows = await db.all<{ local_date: string; total: number }>(
        `SELECT local_date, SUM(value) AS total FROM commit_entry
         WHERE habit_id = ? ${range ? 'AND local_date BETWEEN ? AND ?' : ''}
         GROUP BY local_date`,
        range ? [id, range.from, range.to] : [id],
      );
      return {
        habit,
        schedules,
        progress: new Map(rows.map((r) => [r.local_date, r.total])),
      };
    },

    /** Históricos de todos os hábitos (incl. arquivados) com 3 queries, para o agregado. */
    async histories(range: { from: LocalDate; to: LocalDate }): Promise<HabitHistory[]> {
      const habits = (await db.all<HabitRow>('SELECT * FROM habit ORDER BY sort_order')).map(
        toHabit,
      );
      const schedules = (await db.all<ScheduleRow>('SELECT * FROM habit_schedule')).map(toSchedule);
      const progress = await db.all<{ habit_id: string; local_date: string; total: number }>(
        `SELECT habit_id, local_date, SUM(value) AS total FROM commit_entry
         WHERE local_date BETWEEN ? AND ? GROUP BY habit_id, local_date`,
        [range.from, range.to],
      );
      return habits.map((habit) => ({
        habit,
        schedules: schedules.filter((s) => s.habitId === habit.id),
        progress: new Map(
          progress.filter((p) => p.habit_id === habit.id).map((p) => [p.local_date, p.total]),
        ),
      }));
    },
  };
}

export type HabitRepo = ReturnType<typeof createHabitRepo>;
