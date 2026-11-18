import type { CommitRecord, CommitSource } from '@/data/repositories/commitRepo';
import type { Habit, LocalDate } from '@/domain/types';

export type DayEditCheck = { ok: true } | { ok: false; reason: string };

/** Pode editar o dia? Futuro e hábito arquivado são só leitura. */
export function canEditDay(
  habit: Pick<Habit, 'archivedAt'>,
  date: LocalDate,
  today: LocalDate,
): DayEditCheck {
  if (habit.archivedAt) return { ok: false, reason: 'Hábito arquivado: desarquive para editar.' };
  if (date > today) return { ok: false, reason: 'Não é possível registrar no futuro.' };
  return { ok: true };
}

const SOURCE_LABEL: Record<CommitSource, string> = {
  quick: 'rápido',
  manual: 'manual',
  timer: 'cronômetro',
  edit: 'edição',
  notification: 'notificação',
};

export function sourceLabel(source: CommitSource): string {
  return SOURCE_LABEL[source];
}

/** Hora local do registro: '2026-11-18T17:32:00.000Z' → '14:32' (no fuso do aparelho). */
export function formatCommitTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Valor exibido: '+1' para binário/contagem, '25 min' para tempo. */
export function commitValueLabel(
  goalType: Habit['goalType'],
  c: Pick<CommitRecord, 'value'>,
): string {
  return goalType === 'time' ? `${c.value} min` : '+1';
}
