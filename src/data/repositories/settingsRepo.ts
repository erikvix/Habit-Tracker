import { toLocalDate } from '@/domain/localDate';
import type { LocalDate, Weekday } from '@/domain/types';
import type { ThemePreference } from '@/ui/theme/tokens';

import { ValidationError, type RepoContext } from '../context';
import type { SqlExecutor } from '../driver';

export interface Settings {
  theme: ThemePreference;
  /** 0 = domingo (padrão GitHub), 1 = segunda. */
  weekStart: Extract<Weekday, 0 | 1>;
  /** Hora (0–23) em que o dia lógico vira. 0 = meia-noite. */
  rolloverHour: number;
}

export const defaultSettings: Settings = { theme: 'dark', weekStart: 0, rolloverHour: 0 };

const validators: { [K in keyof Settings]: (v: unknown) => v is Settings[K] } = {
  theme: (v): v is ThemePreference => v === 'system' || v === 'dark' || v === 'light',
  weekStart: (v): v is 0 | 1 => v === 0 || v === 1,
  rolloverHour: (v): v is number =>
    Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 23,
};

export function createSettingsRepo({ db, clock }: RepoContext) {
  async function getAll(exec: SqlExecutor = db): Promise<Settings> {
    const rows = await exec.all<{ key: string; value: string }>('SELECT key, value FROM setting');
    const out: Settings = { ...defaultSettings };
    for (const { key, value } of rows) {
      if (!(key in validators)) continue;
      const k = key as keyof Settings;
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        continue; // valor corrompido → mantém o padrão
      }
      if (validators[k](parsed)) (out as unknown as Record<string, unknown>)[k] = parsed;
    }
    return out;
  }

  return {
    getAll,

    async set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
      if (!validators[key](value)) {
        throw new ValidationError(`Valor inválido para ${key}: ${String(value)}`);
      }
      await db.run(
        `INSERT INTO setting (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, JSON.stringify(value)],
      );
    },

    /** Dia lógico atual, já com a hora de virada configurada. */
    async today(exec: SqlExecutor = db): Promise<LocalDate> {
      const { rolloverHour } = await getAll(exec);
      return toLocalDate(clock.now(), rolloverHour);
    },

    async localDateOf(instant: Date, exec: SqlExecutor = db): Promise<LocalDate> {
      const { rolloverHour } = await getAll(exec);
      return toLocalDate(instant, rolloverHour);
    },
  };
}

export type SettingsRepo = ReturnType<typeof createSettingsRepo>;
