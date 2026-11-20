import { NotFoundError, ValidationError, type RepoContext } from '../context';

export interface Reminder {
  id: string;
  habitId: string;
  /** Minuto do dia, 0–1439 (ex.: 07:30 → 450). */
  minuteOfDay: number;
  enabled: boolean;
}

interface ReminderRow {
  id: string;
  habit_id: string;
  minute_of_day: number;
  enabled: number;
}

const toReminder = (r: ReminderRow): Reminder => ({
  id: r.id,
  habitId: r.habit_id,
  minuteOfDay: r.minute_of_day,
  enabled: r.enabled === 1,
});

function checkMinute(m: number) {
  if (!Number.isInteger(m) || m < 0 || m > 1439) throw new ValidationError('Horário inválido');
}

/** CRUD de lembretes. O agendamento das notificações vive em features/notifications. */
export function createReminderRepo({ db, newId }: RepoContext) {
  return {
    async listByHabit(habitId: string): Promise<Reminder[]> {
      const rows = await db.all<ReminderRow>(
        'SELECT * FROM reminder WHERE habit_id = ? ORDER BY minute_of_day',
        [habitId],
      );
      return rows.map(toReminder);
    },

    /** Lembretes ativos de hábitos não arquivados. */
    async listEnabled(): Promise<Reminder[]> {
      const rows = await db.all<ReminderRow>(
        `SELECT r.* FROM reminder r JOIN habit h ON h.id = r.habit_id
         WHERE r.enabled = 1 AND h.archived_at IS NULL ORDER BY r.minute_of_day`,
      );
      return rows.map(toReminder);
    },

    async add(habitId: string, minuteOfDay: number): Promise<Reminder> {
      checkMinute(minuteOfDay);
      const id = newId();
      await db.run(
        'INSERT INTO reminder (id, habit_id, minute_of_day, enabled) VALUES (?, ?, ?, 1)',
        [id, habitId, minuteOfDay],
      );
      return { id, habitId, minuteOfDay, enabled: true };
    },

    async update(id: string, patch: { minuteOfDay?: number; enabled?: boolean }): Promise<void> {
      if (patch.minuteOfDay !== undefined) checkMinute(patch.minuteOfDay);
      const r = await db.run(
        `UPDATE reminder SET minute_of_day = COALESCE(?, minute_of_day),
                             enabled = COALESCE(?, enabled)
         WHERE id = ?`,
        [patch.minuteOfDay ?? null, patch.enabled === undefined ? null : patch.enabled ? 1 : 0, id],
      );
      if (r.changes === 0) throw new NotFoundError(`Lembrete ${id} não encontrado`);
    },

    async remove(id: string): Promise<void> {
      await db.run('DELETE FROM reminder WHERE id = ?', [id]);
    },

    /** Substitui os horários do hábito (formulário salva a lista inteira). Duplicados viram um. */
    async setForHabit(habitId: string, minutes: number[]): Promise<void> {
      const unique = [...new Set(minutes)].sort((a, b) => a - b);
      unique.forEach(checkMinute);
      await db.transaction(async (tx) => {
        await tx.run('DELETE FROM reminder WHERE habit_id = ?', [habitId]);
        for (const m of unique) {
          await tx.run(
            'INSERT INTO reminder (id, habit_id, minute_of_day, enabled) VALUES (?, ?, ?, 1)',
            [newId(), habitId, m],
          );
        }
      });
    },
  };
}

export type ReminderRepo = ReturnType<typeof createReminderRepo>;
