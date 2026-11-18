import type { GoalType, Level } from './types';

/**
 * Nível do quadrado de um hábito no dia (aritmética inteira, sem float):
 *   0 → nenhum progresso
 *   1 → 1–24% da meta   (qualquer progresso > 0 vale pelo menos 1)
 *   2 → 25–49%
 *   3 → 50–99%
 *   4 → ≥ 100%
 * Binário: 0 ou 4.
 */
export function habitLevel(progress: number, target: number, goalType: GoalType): Level {
  if (progress <= 0) return 0;
  if (goalType === 'binary' || target <= 0) return 4;
  if (progress * 4 < target) return 1;
  if (progress * 2 < target) return 2;
  if (progress < target) return 3;
  return 4;
}

export function isGoalMet(progress: number, target: number, goalType: GoalType): boolean {
  if (goalType === 'binary' || target <= 0) return progress > 0;
  return progress >= target;
}

/**
 * Nível por contagem relativa ao maior dia do período (estilo GitHub):
 *   0 → 0 itens
 *   1 → até 25% do máximo
 *   2 → até 50%
 *   3 → até 75%
 *   4 → acima de 75%
 */
export function relativeLevel(value: number, max: number): Level {
  if (value <= 0 || max <= 0) return 0;
  if (value * 4 <= max) return 1;
  if (value * 2 <= max) return 2;
  if (value * 4 <= max * 3) return 3;
  return 4;
}
