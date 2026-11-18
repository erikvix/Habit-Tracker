import { NotFoundError, ValidationError, type RepoContext } from '../context';
import type { CommitRecord, CommitRepo } from './commitRepo';
import type { SettingsRepo } from './settingsRepo';

export interface ActiveTimer {
  habitId: string;
  startedAt: string;
}

export interface StopResult {
  minutes: number;
  /** null quando a sessão durou menos de 1 minuto (descartada). */
  commit: CommitRecord | null;
}

/** Minutos inteiros entre dois instantes (arredondado; nunca negativo). */
export function elapsedMinutes(startedAt: string, now: Date): number {
  return Math.max(0, Math.round((now.getTime() - Date.parse(startedAt)) / 60_000));
}

/**
 * Cronômetro persistido: sobrevive ao app fechado.
 * Ao parar, os minutos viram um commit no **dia lógico do início**
 * (uma sessão que atravessa a meia-noite conta toda no dia em que começou).
 */
export function createTimerRepo(ctx: RepoContext, settings: SettingsRepo, commits: CommitRepo) {
  const { db, clock } = ctx;

  return {
    async get(habitId: string): Promise<ActiveTimer | null> {
      const row = await db.get<{ habit_id: string; started_at: string }>(
        'SELECT * FROM active_timer WHERE habit_id = ?',
        [habitId],
      );
      return row ? { habitId: row.habit_id, startedAt: row.started_at } : null;
    },

    async listActive(): Promise<ActiveTimer[]> {
      const rows = await db.all<{ habit_id: string; started_at: string }>(
        'SELECT * FROM active_timer',
      );
      return rows.map((r) => ({ habitId: r.habit_id, startedAt: r.started_at }));
    },

    /** Inicia (idempotente: se já está rodando, devolve o existente). */
    async start(habitId: string): Promise<ActiveTimer> {
      return db.transaction(async (tx) => {
        const habit = await tx.get<{ goal_type: string; archived_at: string | null }>(
          'SELECT goal_type, archived_at FROM habit WHERE id = ?',
          [habitId],
        );
        if (!habit) throw new NotFoundError(`Hábito ${habitId} não encontrado`);
        if (habit.archived_at) throw new ValidationError('Hábito arquivado');
        if (habit.goal_type !== 'time') {
          throw new ValidationError('Cronômetro só existe para hábitos de tempo');
        }
        const existing = await tx.get<{ started_at: string }>(
          'SELECT started_at FROM active_timer WHERE habit_id = ?',
          [habitId],
        );
        if (existing) return { habitId, startedAt: existing.started_at };
        const startedAt = clock.now().toISOString();
        await tx.run('INSERT INTO active_timer (habit_id, started_at) VALUES (?, ?)', [
          habitId,
          startedAt,
        ]);
        return { habitId, startedAt };
      });
    },

    async stop(habitId: string): Promise<StopResult> {
      return db.transaction(async (tx) => {
        const row = await tx.get<{ started_at: string }>(
          'SELECT started_at FROM active_timer WHERE habit_id = ?',
          [habitId],
        );
        if (!row) throw new NotFoundError('Nenhum cronômetro ativo para este hábito');
        await tx.run('DELETE FROM active_timer WHERE habit_id = ?', [habitId]);

        const minutes = elapsedMinutes(row.started_at, clock.now());
        if (minutes < 1) return { minutes, commit: null };
        const day = await settings.localDateOf(new Date(row.started_at), tx);
        const commit = await commits.insertWith(tx, habitId, day, Math.min(minutes, 1440), 'timer');
        return { minutes, commit };
      });
    },

    async cancel(habitId: string): Promise<void> {
      await db.run('DELETE FROM active_timer WHERE habit_id = ?', [habitId]);
    },
  };
}

export type TimerRepo = ReturnType<typeof createTimerRepo>;
