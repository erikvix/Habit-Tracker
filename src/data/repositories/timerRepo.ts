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

    /** Cronômetros rodando, com o nome do hábito (para avisos na UI). */
    async listActive(): Promise<(ActiveTimer & { habitName: string })[]> {
      const rows = await db.all<{ habit_id: string; started_at: string; name: string }>(
        `SELECT t.habit_id, t.started_at, h.name FROM active_timer t
         JOIN habit h ON h.id = t.habit_id ORDER BY t.started_at`,
      );
      return rows.map((r) => ({
        habitId: r.habit_id,
        startedAt: r.started_at,
        habitName: r.name,
      }));
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
        // Um cronômetro por vez (decisão de produto): pare o atual antes de iniciar outro.
        const other = await tx.get<{ habit_id: string }>(
          'SELECT habit_id FROM active_timer WHERE habit_id <> ? LIMIT 1',
          [habitId],
        );
        if (other) throw new ValidationError('Já existe um cronômetro rodando');
        const startedAt = clock.now().toISOString();
        await tx.run('INSERT INTO active_timer (habit_id, started_at) VALUES (?, ?)', [
          habitId,
          startedAt,
        ]);
        return { habitId, startedAt };
      });
    },

    /**
     * Para e registra. `minutesOverride` permite corrigir a duração antes de salvar
     * (ex.: cronômetro esquecido rodando); sem ele, usa o tempo decorrido.
     */
    async stop(habitId: string, minutesOverride?: number): Promise<StopResult> {
      if (
        minutesOverride !== undefined &&
        (!Number.isInteger(minutesOverride) || minutesOverride < 1 || minutesOverride > 1440)
      ) {
        throw new ValidationError('Minutos devem ser um inteiro entre 1 e 1440');
      }
      return db.transaction(async (tx) => {
        const row = await tx.get<{ started_at: string }>(
          'SELECT started_at FROM active_timer WHERE habit_id = ?',
          [habitId],
        );
        if (!row) throw new NotFoundError('Nenhum cronômetro ativo para este hábito');
        await tx.run('DELETE FROM active_timer WHERE habit_id = ?', [habitId]);

        const minutes = minutesOverride ?? elapsedMinutes(row.started_at, clock.now());
        if (minutes < 1) return { minutes, commit: null };
        const day = await settings.localDateOf(new Date(row.started_at));
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
