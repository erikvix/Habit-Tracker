import { weekday } from '@/domain/localDate';
import type { GoalType, LocalDate } from '@/domain/types';

/**
 * Milissegundos até a próxima virada do dia lógico (hora `rolloverHour`:00 local).
 * Usa setDate/setHours do horário local, então respeita horário de verão.
 */
export function msUntilNextRollover(now: Date, rolloverHour: number): number {
  const next = new Date(now);
  next.setHours(rolloverHour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
const MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

const MONTHS_LONG = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

/** '2026-11' → 'Novembro 2026'. */
export function monthLongLabel(month: string): string {
  return `${MONTHS_LONG[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

/** Rótulo de mês abreviado e capitalizado: '2026-11' → 'Nov'. */
export function monthShortLabel(month: string): string {
  const m = monthAbbr(month);
  return m.charAt(0).toUpperCase() + m.slice(1);
}

/** '2026-11' → 'nov' (minúsculo, como se escreve mês em pt-BR). */
export function monthAbbr(month: string): string {
  return MONTHS[Number(month.slice(5, 7)) - 1] ?? '';
}

/** '2026-11-18' → 'qua, 18 nov'. Sem Intl: resultado idêntico em teste e no aparelho. */
export function formatShortDate(date: LocalDate): string {
  const day = Number(date.slice(8, 10));
  return `${WEEKDAYS[weekday(date)]}, ${day} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
}

/** Letras dos dias para o seletor, começando no domingo. */
export const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;
export const WEEKDAY_NAMES = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
] as const;

export function unitLabel(goalType: GoalType): string {
  return goalType === 'time' ? 'min' : goalType === 'count' ? 'vezes' : '';
}

/** Progresso do dia para exibição: 'Feito' | 'Pendente' | '3/8' | '15/30 min'. */
export function progressLabel(
  goalType: GoalType,
  progress: number,
  target: number | undefined,
): string {
  if (goalType === 'binary') return progress > 0 ? 'Feito' : 'Pendente';
  const t = target ?? 0;
  return goalType === 'time' ? `${progress}/${t} min` : `${progress}/${t}`;
}

/** "3 de 8", "15 de 30 min", "feito"/"não feito" — usado no detalhe do dia. */
export function dayProgressText(
  goalType: GoalType,
  progress: number,
  target: number | undefined,
): string {
  if (goalType === 'binary') return progress > 0 ? 'feito' : 'não feito';
  const t = target ?? 0;
  return goalType === 'time' ? `${progress} de ${t} min` : `${progress} de ${t}`;
}

/** Fração 0–1 para a barra de progresso. */
export function progressRatio(progress: number, target: number | undefined): number {
  if (!target || target <= 0) return progress > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, progress / target));
}
