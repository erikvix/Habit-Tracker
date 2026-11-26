import { isValidLocalDate } from '@/domain/localDate';
import type { LocalDate, Task } from '@/domain/types';

import { NotFoundError, ValidationError, type RepoContext } from '../context';
import type { SettingsRepo } from './settingsRepo';

export interface TaskRecord extends Task {
  title: string;
  notes: string | null;
  dueDate: LocalDate | null;
  /** Minuto do dia (0–1439) do prazo; só existe com `dueDate`. */
  dueMinute: number | null;
  completedAt: string | null;
  completedLocalDate: LocalDate | null;
  sortOrder: number;
}

interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  due_minute: number | null;
  completed_at: string | null;
  completed_local_date: string | null;
  sort_order: number;
}

export interface TaskInput {
  title: string;
  notes?: string | null;
  dueDate?: LocalDate | null;
  dueMinute?: number | null;
}

export type TaskFilter = 'open' | 'today' | 'overdue' | 'done';

const toTask = (r: TaskRow): TaskRecord => ({
  id: r.id,
  title: r.title,
  notes: r.notes,
  dueDate: r.due_date,
  dueMinute: r.due_minute,
  completedAt: r.completed_at,
  completedLocalDate: r.completed_local_date,
  sortOrder: r.sort_order,
});

function normalize(input: TaskInput) {
  const title = input.title.trim();
  if (!title) throw new ValidationError('Título é obrigatório');
  if (title.length > 200) throw new ValidationError('Título deve ter no máximo 200 caracteres');
  const dueDate = input.dueDate ?? null;
  if (dueDate !== null && !isValidLocalDate(dueDate)) {
    throw new ValidationError(`Prazo inválido: ${dueDate}`);
  }
  const dueMinute = input.dueMinute ?? null;
  if (dueMinute !== null) {
    if (dueDate === null) throw new ValidationError('Horário exige uma data de prazo');
    if (!Number.isInteger(dueMinute) || dueMinute < 0 || dueMinute > 1439) {
      throw new ValidationError('Horário inválido');
    }
  }
  return { title, notes: input.notes?.trim() || null, dueDate, dueMinute };
}

// Prazo mais próximo primeiro; sem prazo por último.
const OPEN_ORDER =
  'ORDER BY due_date IS NULL, due_date, due_minute IS NULL, due_minute, sort_order';

export function createTaskRepo(ctx: RepoContext, settings: SettingsRepo) {
  const { db, clock, newId } = ctx;

  async function get(id: string): Promise<TaskRecord> {
    const row = await db.get<TaskRow>('SELECT * FROM task WHERE id = ?', [id]);
    if (!row) throw new NotFoundError(`Tarefa ${id} não encontrada`);
    return toTask(row);
  }

  return {
    get,

    async create(input: TaskInput): Promise<TaskRecord> {
      const t = normalize(input);
      const id = newId();
      const now = clock.now().toISOString();
      await db.transaction(async (tx) => {
        // Nova tarefa não nasce atrasada. (Na edição, um prazo já vencido é preservado.)
        if (t.dueDate && t.dueDate < (await settings.today())) {
          throw new ValidationError('O prazo não pode ser no passado');
        }
        const next = await tx.get<{ n: number }>(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM task',
        );
        await tx.run(
          `INSERT INTO task (id, title, notes, due_date, due_minute, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, t.title, t.notes, t.dueDate, t.dueMinute, next?.n ?? 0, now, now],
        );
      });
      return get(id);
    },

    async update(id: string, patch: Partial<TaskInput>): Promise<void> {
      const cur = await get(id);
      const t = normalize({
        title: patch.title ?? cur.title,
        notes: patch.notes === undefined ? cur.notes : patch.notes,
        dueDate: patch.dueDate === undefined ? cur.dueDate : patch.dueDate,
        // Remover a data remove o horário junto.
        dueMinute:
          patch.dueMinute !== undefined
            ? patch.dueMinute
            : patch.dueDate === null
              ? null
              : cur.dueMinute,
      });
      await db.run(
        `UPDATE task SET title = ?, notes = ?, due_date = ?, due_minute = ?, updated_at = ?
         WHERE id = ?`,
        [t.title, t.notes, t.dueDate, t.dueMinute, clock.now().toISOString(), id],
      );
    },

    /** Conclui no dia lógico atual. Concluir de novo não muda a data original. */
    async complete(id: string): Promise<void> {
      await db.transaction(async (tx) => {
        const now = clock.now();
        const day = await settings.localDateOf(now);
        const r = await tx.run(
          `UPDATE task SET completed_at = ?, completed_local_date = ?, updated_at = ?
           WHERE id = ? AND completed_at IS NULL`,
          [now.toISOString(), day, now.toISOString(), id],
        );
        if (r.changes === 0 && !(await tx.get('SELECT 1 FROM task WHERE id = ?', [id]))) {
          throw new NotFoundError(`Tarefa ${id} não encontrada`);
        }
      });
    },

    async uncomplete(id: string): Promise<void> {
      await get(id);
      await db.run(
        `UPDATE task SET completed_at = NULL, completed_local_date = NULL, updated_at = ?
         WHERE id = ?`,
        [clock.now().toISOString(), id],
      );
    },

    async remove(id: string): Promise<void> {
      const r = await db.run('DELETE FROM task WHERE id = ?', [id]);
      if (r.changes === 0) throw new NotFoundError(`Tarefa ${id} não encontrada`);
    },

    async list(filter: TaskFilter): Promise<TaskRecord[]> {
      const today = await settings.today();
      const sql: Record<TaskFilter, [string, (string | number)[]]> = {
        open: [`SELECT * FROM task WHERE completed_at IS NULL ${OPEN_ORDER}`, []],
        today: [
          `SELECT * FROM task WHERE completed_at IS NULL AND due_date = ? ${OPEN_ORDER}`,
          [today],
        ],
        overdue: [
          `SELECT * FROM task WHERE completed_at IS NULL AND due_date < ? ${OPEN_ORDER}`,
          [today],
        ],
        done: ['SELECT * FROM task WHERE completed_at IS NOT NULL ORDER BY completed_at DESC', []],
      };
      const [query, params] = sql[filter];
      return (await db.all<TaskRow>(query, params)).map(toTask);
    },

    /** Tarefas concluídas no período (entrada do gráfico geral). */
    async completedBetween(from: LocalDate, to: LocalDate): Promise<Task[]> {
      const rows = await db.all<{ id: string; completed_local_date: string }>(
        `SELECT id, completed_local_date FROM task
         WHERE completed_local_date BETWEEN ? AND ?`,
        [from, to],
      );
      return rows.map((r) => ({ id: r.id, completedLocalDate: r.completed_local_date }));
    },
  };
}

export type TaskRepo = ReturnType<typeof createTaskRepo>;
