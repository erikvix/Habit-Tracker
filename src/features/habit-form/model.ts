import { ALL_DAYS, maskFromWeekdays, weekdaysFromMask } from '@/domain/schedule';
import type { GoalType, Weekday } from '@/domain/types';

export interface HabitFormValues {
  name: string;
  description: string;
  goalType: GoalType;
  target: number;
  everyDay: boolean;
  days: Weekday[];
}

export type HabitFormErrors = Partial<Record<'name' | 'target' | 'days', string>>;

export const DEFAULT_TARGET: Record<GoalType, number> = { binary: 1, count: 4, time: 30 };
export const MAX_TARGET: Record<GoalType, number> = { binary: 1, count: 1000, time: 1440 };

export const emptyHabitForm: HabitFormValues = {
  name: '',
  description: '',
  goalType: 'binary',
  target: DEFAULT_TARGET.binary,
  everyDay: true,
  days: [1, 2, 3, 4, 5],
};

/** Mesmas regras do repositório, com mensagens para exibir no campo. */
export function validateHabitForm(v: HabitFormValues): HabitFormErrors {
  const errors: HabitFormErrors = {};
  const name = v.name.trim();
  if (!name) errors.name = 'Dê um nome ao hábito';
  else if (name.length > 80) errors.name = 'Máximo de 80 caracteres';

  if (v.goalType !== 'binary') {
    const max = MAX_TARGET[v.goalType];
    if (!Number.isInteger(v.target) || v.target < 1 || v.target > max) {
      errors.target = `Informe um valor entre 1 e ${max}`;
    }
  }
  if (!v.everyDay && v.days.length === 0) errors.days = 'Escolha pelo menos um dia';
  return errors;
}

export function activeDaysMask(v: HabitFormValues): number {
  return v.everyDay ? ALL_DAYS : maskFromWeekdays(v.days);
}

/** Converte para a entrada do repositório. */
export function toHabitInput(v: HabitFormValues) {
  return {
    name: v.name.trim(),
    description: v.description.trim() || null,
    goalType: v.goalType,
    dailyTarget: v.goalType === 'binary' ? 1 : v.target,
    activeDays: activeDaysMask(v),
  };
}

/** Preenche o formulário de edição com o hábito e a versão de meta vigente. */
export function habitToForm(
  habit: { name: string; description?: string | null; goalType: GoalType },
  schedule: { dailyTarget: number; activeDays: number } | undefined,
): HabitFormValues {
  const mask = schedule?.activeDays ?? ALL_DAYS;
  return {
    name: habit.name,
    description: habit.description ?? '',
    goalType: habit.goalType,
    target: schedule?.dailyTarget ?? DEFAULT_TARGET[habit.goalType],
    everyDay: mask === ALL_DAYS,
    days: mask === ALL_DAYS ? [1, 2, 3, 4, 5] : weekdaysFromMask(mask),
  };
}

/** Ao trocar o tipo, a meta vai para o padrão do novo tipo. */
export function changeGoalType(v: HabitFormValues, goalType: GoalType): HabitFormValues {
  return { ...v, goalType, target: DEFAULT_TARGET[goalType] };
}

/** "Contagem · 8/dia · seg a sex" — usado na lista de hábitos. */
export function describeSchedule(goalType: GoalType, target: number, mask: number): string {
  const kind =
    goalType === 'binary'
      ? 'Sim/não'
      : goalType === 'count'
        ? `Contagem · ${target}/dia`
        : `Tempo · ${target} min/dia`;
  return `${kind} · ${describeDays(mask)}`;
}

const SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

export function describeDays(mask: number): string {
  if (mask === ALL_DAYS) return 'todos os dias';
  const days = weekdaysFromMask(mask);
  if (mask === maskFromWeekdays([1, 2, 3, 4, 5])) return 'seg a sex';
  if (mask === maskFromWeekdays([0, 6])) return 'fins de semana';
  return days.map((d) => SHORT[d]).join(', ');
}
