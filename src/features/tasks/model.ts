import type { TaskInput, TaskRecord } from '@/data/repositories/taskRepo';
import { addDays } from '@/domain/localDate';
import type { LocalDate } from '@/domain/types';

import { formatShortDate } from '../shared/model';

export interface OpenTaskGroups {
  overdue: TaskRecord[];
  today: TaskRecord[];
  upcoming: TaskRecord[];
  noDate: TaskRecord[];
}

/** Agrupa tarefas abertas por prazo, mantendo a ordem recebida (prazo mais próximo primeiro). */
export function groupOpenTasks(tasks: readonly TaskRecord[], today: LocalDate): OpenTaskGroups {
  const g: OpenTaskGroups = { overdue: [], today: [], upcoming: [], noDate: [] };
  for (const t of tasks) {
    if (t.completedAt) continue;
    if (!t.dueDate) g.noDate.push(t);
    else if (t.dueDate < today) g.overdue.push(t);
    else if (t.dueDate === today) g.today.push(t);
    else g.upcoming.push(t);
  }
  return g;
}

/** 600 → '10:00'. */
export function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export type DueTone = 'danger' | 'muted';

/** Rótulo do prazo: 'Atrasada · 10 nov', 'Hoje · 10:00', 'Amanhã', 'sex, 20 nov'. */
export function dueLabel(
  task: Pick<TaskRecord, 'dueDate' | 'dueMinute'>,
  today: LocalDate,
): { text: string; tone: DueTone } | null {
  if (!task.dueDate) return null;
  const time = task.dueMinute !== null ? ` · ${formatMinute(task.dueMinute)}` : '';
  const short = formatShortDate(task.dueDate);
  if (task.dueDate < today) {
    return { text: `Atrasada · ${short.split(', ')[1]}${time}`, tone: 'danger' };
  }
  if (task.dueDate === today) return { text: `Hoje${time}`, tone: 'muted' };
  if (task.dueDate === addDays(today, 1)) return { text: `Amanhã${time}`, tone: 'muted' };
  return { text: `${short}${time}`, tone: 'muted' };
}

/** Rótulo de conclusão: 'Concluída hoje', 'Concluída ontem', 'Concluída qua, 18 nov'. */
export function completedLabel(date: LocalDate | null, today: LocalDate): string {
  if (!date) return 'Concluída';
  if (date === today) return 'Concluída hoje';
  if (date === addDays(today, -1)) return 'Concluída ontem';
  return `Concluída ${formatShortDate(date)}`;
}

// ---------- Formulário ----------

export type DueChoice = 'none' | 'today' | 'tomorrow' | 'custom';

export interface TaskFormValues {
  title: string;
  notes: string;
  due: DueChoice;
  /** Data quando due = 'custom'. */
  customDate: LocalDate | null;
  /** Minuto do dia, opcional (só com data). */
  dueMinute: number | null;
}

export type TaskFormErrors = Partial<Record<'title' | 'due', string>>;

export const emptyTaskForm: TaskFormValues = {
  title: '',
  notes: '',
  due: 'none',
  customDate: null,
  dueMinute: null,
};

export function resolveDueDate(v: TaskFormValues, today: LocalDate): LocalDate | null {
  switch (v.due) {
    case 'none':
      return null;
    case 'today':
      return today;
    case 'tomorrow':
      return addDays(today, 1);
    case 'custom':
      return v.customDate;
  }
}

/**
 * @param keepPastDate prazo passado que a tarefa já tinha (edição de tarefa atrasada):
 *   continua aceito, mas não dá para escolher *outra* data passada.
 */
export function validateTaskForm(
  v: TaskFormValues,
  today: LocalDate,
  keepPastDate: LocalDate | null = null,
): TaskFormErrors {
  const e: TaskFormErrors = {};
  const title = v.title.trim();
  if (!title) e.title = 'Dê um título à tarefa';
  else if (title.length > 200) e.title = 'Máximo de 200 caracteres';
  if (v.due === 'custom' && !v.customDate) e.due = 'Escolha uma data';
  else if (v.due === 'custom' && v.customDate! < today && v.customDate !== keepPastDate) {
    e.due = 'O prazo não pode ser no passado';
  }
  return e;
}

/** Prazo passado já existente que a edição deve preservar (null se não houver). */
export function pastDueToKeep(initial: TaskFormValues, today: LocalDate): LocalDate | null {
  return initial.due === 'custom' && initial.customDate && initial.customDate < today
    ? initial.customDate
    : null;
}

export function toTaskInput(v: TaskFormValues, today: LocalDate): TaskInput {
  const dueDate = resolveDueDate(v, today);
  return {
    title: v.title.trim(),
    notes: v.notes.trim() || null,
    dueDate,
    dueMinute: dueDate ? v.dueMinute : null,
  };
}

/** Preenche o formulário a partir de uma tarefa existente. */
export function taskToForm(t: TaskRecord, today: LocalDate): TaskFormValues {
  const due: DueChoice = !t.dueDate
    ? 'none'
    : t.dueDate === today
      ? 'today'
      : t.dueDate === addDays(today, 1)
        ? 'tomorrow'
        : 'custom';
  return {
    title: t.title,
    notes: t.notes ?? '',
    due,
    customDate: due === 'custom' ? t.dueDate : null,
    dueMinute: t.dueMinute,
  };
}
