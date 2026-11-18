import * as SQLite from 'expo-sqlite';

import { createSerializedDriver, type SqlDriver, type SqlParams } from './driver';

/** Abre o banco do app e devolve o driver serializado. */
export async function openExpoDriver(name = 'todo-tracker.db'): Promise<SqlDriver> {
  const db = await SQLite.openDatabaseAsync(name);
  const p = (params?: SqlParams) => (params ?? []) as SQLite.SQLiteBindParams;
  return createSerializedDriver({
    async run(sql, params) {
      const r = await db.runAsync(sql, p(params));
      return { changes: r.changes, lastInsertRowId: r.lastInsertRowId };
    },
    async get<T>(sql: string, params?: SqlParams) {
      return (await db.getFirstAsync<T>(sql, p(params))) ?? undefined;
    },
    all: <T>(sql: string, params?: SqlParams) => db.getAllAsync<T>(sql, p(params)),
    exec: (sql) => db.execAsync(sql),
  });
}
