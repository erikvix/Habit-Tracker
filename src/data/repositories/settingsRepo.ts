import { toLocalDate } from '@/domain/localDate';
import type { LocalDate } from '@/domain/types';
import type { ThemePreference } from '@/ui/theme/tokens';

import { ValidationError, type RepoContext } from '../context';
import type { SqlExecutor } from '../driver';

export interface Settings {
  theme: ThemePreference;
}

export const defaultSettings: Settings = { theme: 'dark' };

/*
 * O dia é o do relógio do celular (vira à meia-noite) e a semana começa no domingo.
 * Chaves antigas (weekStart, rolloverHour) que existam no banco são ignoradas pelo getAll.
 */

const validators: { [K in keyof Settings]: (v: unknown) => v is Settings[K] } = {
  theme: (v): v is ThemePreference => v === 'system' || v === 'dark' || v === 'light',
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

    /** Dia atual pelo relógio do celular. */
    async today(): Promise<LocalDate> {
      return toLocalDate(clock.now());
    },

    async localDateOf(instant: Date): Promise<LocalDate> {
      return toLocalDate(instant);
    },
  };
}

export type SettingsRepo = ReturnType<typeof createSettingsRepo>;
