/**
 * Tipos do domínio. Camada pura: sem React Native, sem SQLite.
 * Todas as datas de calendário são `LocalDate` ('YYYY-MM-DD') no "dia lógico"
 * do usuário (já considerando a hora de virada do dia).
 */

/** Data de calendário local no formato 'YYYY-MM-DD'. */
export type LocalDate = string;

/** Mês no formato 'YYYY-MM'. */
export type MonthKey = string;

export type GoalType = 'binary' | 'count' | 'time';

/** 0 = nenhum commit … 4 = meta cumprida (ou topo da escala no agregado). */
export type Level = 0 | 1 | 2 | 3 | 4;

/** 0 = domingo … 6 = sábado (mesma convenção de Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Habit {
  id: string;
  name: string;
  description?: string | null;
  goalType: GoalType;
  /** Primeiro dia que conta para eficiência/streak. */
  startDate: LocalDate;
  /** Dia em que foi arquivado; ele e os seguintes não contam. */
  archivedAt?: LocalDate | null;
}

/**
 * Versão da configuração de meta. Vale de `effectiveFrom` até a próxima versão.
 * Mudar a meta cria uma nova versão; o passado continua julgado pela meta antiga.
 */
export interface HabitSchedule {
  habitId: string;
  effectiveFrom: LocalDate;
  /** binary = 1; count = vezes; time = minutos. */
  dailyTarget: number;
  /** Bitmask de dias ativos: bit 0 = domingo … bit 6 = sábado. 127 = todos. */
  activeDays: number;
}

/** Soma dos valores dos commits por dia (binary/count: nº de commits; time: minutos). */
export type ProgressByDate = ReadonlyMap<LocalDate, number>;

/** Tudo o que o domínio precisa para avaliar um hábito. */
export interface HabitHistory {
  habit: Habit;
  schedules: readonly HabitSchedule[];
  progress: ProgressByDate;
}

/** Tarefa avulsa (todo). Concluir = 1 item feito no dia da conclusão. */
export interface Task {
  id: string;
  completedLocalDate?: LocalDate | null;
}
