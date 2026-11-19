import { elapsedMinutes } from '@/data/repositories/timerRepo';
import { toLocalDate } from '@/domain/localDate';
import type { LocalDate } from '@/domain/types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Tempo decorrido para exibição: '0:05', '12:34', '1:02:15'. Nunca negativo. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Minutos sugeridos ao parar (mesma regra do repositório), limitados a 1440. */
export function suggestedMinutes(startedAt: string, now: Date): number {
  return Math.min(1440, elapsedMinutes(startedAt, now));
}

/**
 * Se a sessão atravessou a virada do dia, devolve o dia em que começou
 * (é nele que os minutos são registrados). Senão, null.
 */
export function crossedDayStart(
  startedAt: string,
  now: Date,
  rolloverHour: number,
): LocalDate | null {
  const startDay = toLocalDate(new Date(startedAt), rolloverHour);
  return startDay !== toLocalDate(now, rolloverHour) ? startDay : null;
}

/** "25 min", "1 h 05 min". */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${pad(min % 60)} min`;
}
