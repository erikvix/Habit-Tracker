import type { LocalDate, MonthKey, Weekday } from './types';

/**
 * Aritmética de datas sem hora. Internamente usa Date em UTC só como calculadora,
 * o que torna tudo imune a horário de verão e ao fuso do aparelho.
 */

const RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

const pad = (n: number, len = 2) => String(n).padStart(len, '0');

export function isValidLocalDate(value: string): boolean {
  const m = RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function toUtcMs(date: LocalDate): number {
  const m = RE.exec(date);
  if (!m || !isValidLocalDate(date)) throw new Error(`LocalDate inválida: "${date}"`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fromUtcMs(ms: number): LocalDate {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function makeLocalDate(year: number, month: number, day: number): LocalDate {
  const ld = `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
  if (!isValidLocalDate(ld)) throw new Error(`LocalDate inválida: "${ld}"`);
  return ld;
}

/**
 * Dia lógico de um instante, no fuso do aparelho.
 * Com `rolloverHour` = 4, 01:30 de terça ainda conta como segunda.
 */
export function toLocalDate(instant: Date, rolloverHour = 0): LocalDate {
  if (!Number.isInteger(rolloverHour) || rolloverHour < 0 || rolloverHour > 23) {
    throw new Error(`rolloverHour inválida: ${rolloverHour}`);
  }
  const calendar = makeLocalDate(instant.getFullYear(), instant.getMonth() + 1, instant.getDate());
  return instant.getHours() < rolloverHour ? addDays(calendar, -1) : calendar;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** b − a em dias (positivo se b é depois de a). */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

export function weekday(date: LocalDate): Weekday {
  return new Date(toUtcMs(date)).getUTCDay() as Weekday;
}

/** Comparação lexicográfica funciona para 'YYYY-MM-DD'. */
export const minDate = (a: LocalDate, b: LocalDate): LocalDate => (a <= b ? a : b);
export const maxDate = (a: LocalDate, b: LocalDate): LocalDate => (a >= b ? a : b);

export function monthKey(date: LocalDate): MonthKey {
  return date.slice(0, 7);
}

export function startOfMonth(month: MonthKey): LocalDate {
  return `${month}-01`;
}

export function endOfMonth(month: MonthKey): LocalDate {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return fromUtcMs(Date.UTC(y, m, 0)); // dia 0 do mês seguinte
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}`;
}

/** Meses de `from` a `to`, inclusive. */
export function eachMonth(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m);
  return out;
}

/** Dias de `from` a `to`, inclusive. Vazio se from > to. */
export function* eachDay(from: LocalDate, to: LocalDate): Generator<LocalDate> {
  for (let ms = toUtcMs(from), end = toUtcMs(to); ms <= end; ms += DAY_MS) {
    yield fromUtcMs(ms);
  }
}

/** Primeiro dia da semana que contém `date` (weekStart 0 = domingo). */
export function startOfWeek(date: LocalDate, weekStart: Weekday = 0): LocalDate {
  const offset = (weekday(date) - weekStart + 7) % 7;
  return addDays(date, -offset);
}
