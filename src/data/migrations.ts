import type { SqlDriver } from './driver';

export interface Migration {
  version: number;
  up: string;
}

/**
 * Migrations em ordem. Nunca edite uma migration já distribuída: crie a próxima.
 * `commit` é palavra reservada em SQL, por isso a tabela é `commit_entry`.
 */
export const migrations: readonly Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE habit (
        id          TEXT PRIMARY KEY NOT NULL,
        name        TEXT NOT NULL,
        description TEXT,
        goal_type   TEXT NOT NULL CHECK (goal_type IN ('binary','count','time')),
        start_date  TEXT NOT NULL,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        archived_at TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );

      CREATE TABLE habit_schedule (
        id             TEXT PRIMARY KEY NOT NULL,
        habit_id       TEXT NOT NULL REFERENCES habit(id) ON DELETE CASCADE,
        effective_from TEXT NOT NULL,
        daily_target   INTEGER NOT NULL CHECK (daily_target > 0),
        active_days    INTEGER NOT NULL CHECK (active_days BETWEEN 1 AND 127),
        UNIQUE (habit_id, effective_from)
      );

      CREATE TABLE commit_entry (
        id            TEXT PRIMARY KEY NOT NULL,
        habit_id      TEXT NOT NULL REFERENCES habit(id) ON DELETE CASCADE,
        local_date    TEXT NOT NULL,
        value         INTEGER NOT NULL CHECK (value > 0),
        created_at    TEXT NOT NULL,
        tz_offset_min INTEGER NOT NULL,
        source        TEXT NOT NULL
                      CHECK (source IN ('quick','manual','timer','edit','notification'))
      );
      CREATE INDEX idx_commit_habit_date ON commit_entry(habit_id, local_date);

      CREATE TABLE task (
        id                   TEXT PRIMARY KEY NOT NULL,
        title                TEXT NOT NULL,
        notes                TEXT,
        due_date             TEXT,
        due_minute           INTEGER CHECK (due_minute BETWEEN 0 AND 1439),
        completed_at         TEXT,
        completed_local_date TEXT,
        sort_order           INTEGER NOT NULL DEFAULT 0,
        created_at           TEXT NOT NULL,
        updated_at           TEXT NOT NULL
      );
      CREATE INDEX idx_task_completed ON task(completed_local_date);
      CREATE INDEX idx_task_due ON task(due_date);

      CREATE TABLE reminder (
        id            TEXT PRIMARY KEY NOT NULL,
        habit_id      TEXT NOT NULL REFERENCES habit(id) ON DELETE CASCADE,
        minute_of_day INTEGER NOT NULL CHECK (minute_of_day BETWEEN 0 AND 1439),
        enabled       INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1))
      );
      CREATE INDEX idx_reminder_habit ON reminder(habit_id);

      CREATE TABLE active_timer (
        habit_id   TEXT PRIMARY KEY NOT NULL REFERENCES habit(id) ON DELETE CASCADE,
        started_at TEXT NOT NULL
      );

      CREATE TABLE setting (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `,
  },
];

export const LATEST_SCHEMA_VERSION = migrations.at(-1)!.version;

export async function getSchemaVersion(db: SqlDriver): Promise<number> {
  const row = await db.get<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * Configura a conexão e aplica as migrations pendentes, cada uma numa transação
 * (o `user_version` é transacional no SQLite). Idempotente.
 */
export async function migrate(
  db: SqlDriver,
  list: readonly Migration[] = migrations,
): Promise<number> {
  await db.exec('PRAGMA journal_mode = WAL');
  await db.exec('PRAGMA foreign_keys = ON');

  let current = await getSchemaVersion(db);
  for (const m of list) {
    if (m.version <= current) continue;
    await db.transaction(async (tx) => {
      await tx.exec(m.up);
      await tx.exec(`PRAGMA user_version = ${Number(m.version)}`);
    });
    current = m.version;
  }
  return current;
}
