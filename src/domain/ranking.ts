import type { MonthEfficiency } from './efficiency';

export interface RankedHabit {
  habitId: string;
  name: string;
  month: MonthEfficiency;
}

/**
 * Ranking do mês: eficiência desc; empate → mais dias cumpridos; depois nome.
 * Hábitos sem dia ativo no mês (eficiência null) vão para o fim.
 */
export function rankByEfficiency(items: readonly RankedHabit[]): RankedHabit[] {
  return [...items].sort((a, b) => {
    const ea = a.month.efficiency;
    const eb = b.month.efficiency;
    if (ea === null && eb !== null) return 1;
    if (eb === null && ea !== null) return -1;
    if (ea !== null && eb !== null && ea !== eb) return eb - ea;
    if (a.month.metDays !== b.month.metDays) return b.month.metDays - a.month.metDays;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}
