import { createHabitEvaluator } from '@/domain/habitDay';
import { addDays, toLocalDate } from '@/domain/localDate';
import type { HabitHistory, LocalDate } from '@/domain/types';

import { formatMinute } from '../tasks/model';

/** Dias à frente agendados a cada reconciliação. */
export const HORIZON_DAYS = 14;
/** O Android limita alarmes por app (~500); fica uma folga. */
export const MAX_SCHEDULED = 400;

export const CHANNEL_ID = 'lembretes';
/** Categorias (sem ':' ou '-', exigência do expo-notifications). */
export const CATEGORY = { commit: 'habit_commit', task: 'task_complete' } as const;
export const ACTION = { commit: 'commit', complete: 'complete' } as const;

export type NotificationData =
  | { kind: 'habit'; habitId: string; date: LocalDate; sig: string }
  | { kind: 'task'; taskId: string; sig: string };

export interface PlannedNotification {
  /** Determinístico: o mesmo lembrete gera sempre o mesmo id. */
  id: string;
  /** Epoch ms do disparo. */
  at: number;
  title: string;
  body: string;
  category?: string;
  data: NotificationData;
}

export interface PlanInput {
  now: Date;
  /** Hora da virada do dia; o app usa meia-noite (0). */
  rolloverHour?: number;
  /** Hábitos não arquivados; o progresso precisa incluir o dia de hoje. */
  habits: { history: HabitHistory; reminders: number[] }[];
  /** Tarefas abertas. */
  tasks: { id: string; title: string; dueDate: LocalDate | null; dueMinute: number | null }[];
  horizonDays?: number;
}

/**
 * Instante em que o minuto `minute` do dia lógico `date` acontece. Com virada às 4h,
 * um lembrete às 01:00 do dia lógico D toca no dia de calendário D+1.
 */
export function instantOf(date: LocalDate, minute: number, rolloverHour = 0): Date {
  const calendar = minute < rolloverHour * 60 ? addDays(date, 1) : date;
  const [y, m, d] = calendar.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d, Math.floor(minute / 60), minute % 60);
}

function habitBody(
  goalType: HabitHistory['habit']['goalType'],
  target: number | undefined,
): string {
  if (goalType === 'binary') return 'Já fez hoje? Um commit mantém a sequência.';
  if (goalType === 'count') return `Meta de hoje: ${target ?? 1}. Toque em Commitar para +1.`;
  return `Meta de hoje: ${target ?? 1} min. Toque para abrir o cronômetro.`;
}

/**
 * Decide o que deve estar agendado agora. Puro: mesma entrada, mesma saída.
 * - hábitos: só dias ativos, dentro da janela, nunca no passado, e hoje só se a meta não foi batida;
 * - tarefas: no prazo com horário, se ainda for futuro.
 */
export function planNotifications(input: PlanInput): PlannedNotification[] {
  const { now, rolloverHour = 0 } = input;
  const horizon = input.horizonDays ?? HORIZON_DAYS;
  const nowMs = now.getTime();
  const today = toLocalDate(now, rolloverHour);
  const out: PlannedNotification[] = [];

  for (const { history, reminders } of input.habits) {
    const { habit } = history;
    if (habit.archivedAt || reminders.length === 0) continue;
    const evaluate = createHabitEvaluator(history);
    for (let i = 0; i < horizon; i++) {
      const date = addDays(today, i);
      if (date < habit.startDate) continue;
      const day = evaluate(date);
      if (!day.active || day.met) continue;
      for (const minute of new Set(reminders)) {
        const at = instantOf(date, minute, rolloverHour).getTime();
        if (at <= nowMs) continue;
        const body = habitBody(habit.goalType, day.target);
        out.push({
          id: `habit:${habit.id}:${date}:${minute}`,
          at,
          title: habit.name,
          body,
          category: habit.goalType === 'time' ? undefined : CATEGORY.commit,
          data: { kind: 'habit', habitId: habit.id, date, sig: `${habit.name}|${body}` },
        });
      }
    }
  }

  for (const t of input.tasks) {
    if (!t.dueDate || t.dueMinute === null) continue;
    const at = instantOf(t.dueDate, t.dueMinute, rolloverHour).getTime();
    if (at <= nowMs) continue;
    const body = `Prazo às ${formatMinute(t.dueMinute)}.`;
    out.push({
      id: `task:${t.id}:${t.dueDate}:${t.dueMinute}`,
      at,
      title: t.title,
      body,
      category: CATEGORY.task,
      data: { kind: 'task', taskId: t.id, sig: `${t.title}|${body}` },
    });
  }

  return out.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)).slice(0, MAX_SCHEDULED);
}

export interface ScheduledInfo {
  id: string;
  /** Assinatura do conteúdo agendado (data.sig); ausente se não foi criado por nós. */
  sig?: string;
}

/** Só mexe no que o app criou (prefixos conhecidos). */
const isOurs = (id: string) => id.startsWith('habit:') || id.startsWith('task:');

/**
 * Diferença entre o plano e o que o sistema tem: cancela o que sobrou ou mudou de conteúdo,
 * agenda o que falta. O que já está certo não é tocado.
 */
export function reconcile(planned: PlannedNotification[], scheduled: ScheduledInfo[]) {
  const want = new Map(planned.map((p) => [p.id, p]));
  const have = new Map(scheduled.filter((s) => isOurs(s.id)).map((s) => [s.id, s.sig]));
  const cancel: string[] = [];
  for (const [id, sig] of have) {
    const p = want.get(id);
    if (!p || p.data.sig !== sig) cancel.push(id);
  }
  const schedule = planned.filter((p) => !have.has(p.id) || cancel.includes(p.id));
  return { cancel, schedule };
}

/** Lê o payload de uma notificação recebida; null se não for nossa ou estiver malformada. */
export function parseData(raw: unknown): NotificationData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.kind === 'habit' && typeof d.habitId === 'string' && typeof d.date === 'string') {
    return { kind: 'habit', habitId: d.habitId, date: d.date, sig: String(d.sig ?? '') };
  }
  if (d.kind === 'task' && typeof d.taskId === 'string') {
    return { kind: 'task', taskId: d.taskId, sig: String(d.sig ?? '') };
  }
  return null;
}

/** Quando um agendamento do app dispara, lido do próprio id (`tipo:id:data:minuto`). */
export function scheduledAt(id: string, rolloverHour = 0): number | null {
  const m = /^(?:habit|task):.+:(\d{4}-\d{2}-\d{2}):(\d{1,4})$/.exec(id);
  if (!m) return null;
  return instantOf(m[1]!, Number(m[2]), rolloverHour).getTime();
}
