import { isValidLocalDate } from '@/domain/localDate';
import type { GoalType, LocalDate } from '@/domain/types';

import { NotFoundError, ValidationError, type RepoContext } from '../context';
import type { SqlExecutor } from '../driver';
import type { SettingsRepo } from './settingsRepo';

export type CommitSource = 'quick' | 'manual' | 'timer' | 'edit' | 'notification';

export interface CommitRecord {
  id: string;
  habitId: string;
  localDate: LocalDate;
  value: number;
  createdAt: string;
  tzOffsetMin: number;
  source: CommitSource;
}

interface CommitRow {
  id: string;
  habit_id: string;
  local_date: string;
  value: number;
  created_at: string;
  tz_offset_min: number;
  source: CommitSource;
}

const toCommit = (r: CommitRow): CommitRecord => ({
  id: r.id,
  habitId: r.habit_id,
  localDate: r.local_date,
  value: r.value,
  createdAt: r.created_at,
  tzOffsetMin: r.tz_offset_min,
  source: r.source,
});

/** Valor efetivo de um commit: binário e contagem são sempre 1; tempo = minutos. */
function normalizeValue(goalType: GoalType, value: number): number {
  if (goalType !== 'time') return 1;
  if (!Number.isInteger(value) || value < 1 || value > 1440) {
    throw new ValidationError('Minutos devem ser um inteiro entre 1 e 1440');
  }
  return value;
}

export function createCommitRepo(ctx: RepoContext, settings: SettingsRepo) {
  const { db, clock, newId } = ctx;

  async function habitInfo(exec: SqlExecutor, habitId: string) {
    const h = await exec.get<{ goal_type: GoalType; start_date: string }>(
      'SELECT goal_type, start_date FROM habit WHERE id = ?',
      [habitId],
    );
    if (!h) throw new NotFoundError(`Hábito ${habitId} não encontrado`);
    return h;
  }

  /**
   * Insere um commit no dia `date` respeitando as regras do tipo de meta.
   * Commit antes do início puxa `start_date` e a primeira vigência da meta para trás
   * (senão o dia ficaria sem meta e seria tratado como inativo).
   * Binário: no máximo 1 por dia — devolve o existente.
   */
  async function insert(
    tx: SqlExecutor,
    habitId: string,
    date: LocalDate,
    value: number,
    source: CommitSource,
  ): Promise<CommitRecord> {
    const habit = await habitInfo(tx, habitId);
    const v = normalizeValue(habit.goal_type, value);

    if (habit.goal_type === 'binary') {
      const existing = await tx.get<CommitRow>(
        'SELECT * FROM commit_entry WHERE habit_id = ? AND local_date = ? LIMIT 1',
        [habitId, date],
      );
      if (existing) return toCommit(existing);
    }

    if (date < habit.start_date) {
      await tx.run('UPDATE habit SET start_date = ? WHERE id = ?', [date, habitId]);
      await tx.run(
        `UPDATE habit_schedule SET effective_from = ?
         WHERE habit_id = ? AND effective_from = (
           SELECT MIN(effective_from) FROM habit_schedule WHERE habit_id = ?
         ) AND effective_from > ?`,
        [date, habitId, habitId, date],
      );
    }

    const now = clock.now();
    const row: CommitRow = {
      id: newId(),
      habit_id: habitId,
      local_date: date,
      value: v,
      created_at: now.toISOString(),
      tz_offset_min: -now.getTimezoneOffset(),
      source,
    };
    await tx.run(
      `INSERT INTO commit_entry (id, habit_id, local_date, value, created_at, tz_offset_min, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [row.id, row.habit_id, row.local_date, row.value, row.created_at, row.tz_offset_min, source],
    );
    return toCommit(row);
  }

  return {
    insertWith: insert,

    /** Commit de hoje (botão rápido, +1, minutos manuais, ação da notificação). */
    add(
      habitId: string,
      { value = 1, source = 'quick' }: { value?: number; source?: CommitSource } = {},
    ): Promise<CommitRecord> {
      return db.transaction(async (tx) => {
        const today = await settings.today(tx);
        return insert(tx, habitId, today, value, source);
      });
    },

    /** Commit em data passada (edição de histórico). Datas futuras são recusadas. */
    async addOnDate(
      habitId: string,
      date: LocalDate,
      value = 1,
      source: CommitSource = 'edit',
    ): Promise<CommitRecord> {
      if (!isValidLocalDate(date)) throw new ValidationError(`Data inválida: ${date}`);
      return db.transaction(async (tx) => {
        const today = await settings.today(tx);
        if (date > today) throw new ValidationError('Não é possível commitar no futuro');
        return insert(tx, habitId, date, value, source);
      });
    },

    /** Desfaz o commit mais recente do dia (o "−1"). @returns false se não havia commit. */
    async removeLast(habitId: string, date?: LocalDate): Promise<boolean> {
      return db.transaction(async (tx) => {
        const day = date ?? (await settings.today(tx));
        const r = await tx.run(
          `DELETE FROM commit_entry WHERE id = (
             SELECT id FROM commit_entry WHERE habit_id = ? AND local_date = ?
             ORDER BY created_at DESC, rowid DESC LIMIT 1
           )`,
          [habitId, day],
        );
        return r.changes > 0;
      });
    },

    async listByDay(habitId: string, date: LocalDate): Promise<CommitRecord[]> {
      const rows = await db.all<CommitRow>(
        `SELECT * FROM commit_entry WHERE habit_id = ? AND local_date = ?
         ORDER BY created_at, rowid`,
        [habitId, date],
      );
      return rows.map(toCommit);
    },

    /** Edita o valor (só faz diferença para tempo; binário/contagem ficam em 1). */
    async updateValue(id: string, value: number): Promise<void> {
      await db.transaction(async (tx) => {
        const row = await tx.get<{ habit_id: string }>(
          'SELECT habit_id FROM commit_entry WHERE id = ?',
          [id],
        );
        if (!row) throw new NotFoundError(`Commit ${id} não encontrado`);
        const habit = await habitInfo(tx, row.habit_id);
        await tx.run('UPDATE commit_entry SET value = ? WHERE id = ?', [
          normalizeValue(habit.goal_type, value),
          id,
        ]);
      });
    },

    async remove(id: string): Promise<void> {
      const r = await db.run('DELETE FROM commit_entry WHERE id = ?', [id]);
      if (r.changes === 0) throw new NotFoundError(`Commit ${id} não encontrado`);
    },

    /** Nº de commits por dia (para "total de commits no período"). */
    async countByDate(
      habitId: string,
      from: LocalDate,
      to: LocalDate,
    ): Promise<Map<LocalDate, number>> {
      const rows = await db.all<{ local_date: string; n: number }>(
        `SELECT local_date, COUNT(*) AS n FROM commit_entry
         WHERE habit_id = ? AND local_date BETWEEN ? AND ? GROUP BY local_date`,
        [habitId, from, to],
      );
      return new Map(rows.map((r) => [r.local_date, r.n]));
    },
  };
}

export type CommitRepo = ReturnType<typeof createCommitRepo>;
