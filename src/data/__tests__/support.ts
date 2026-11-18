// Tipos do Node só neste arquivo de teste: o código do app não deve enxergar APIs do Node.
/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';

import type { Clock, RepoContext } from '../context';
import { createSerializedDriver, type SqlDriver, type SqlParams } from '../driver';
import { migrate } from '../migrations';
import { createRepositories } from '../repositories';

/** Driver de teste sobre node:sqlite (embutido no Node 22), banco em memória. */
export function createNodeDriver(): SqlDriver {
  const db = new DatabaseSync(':memory:');
  const p = (params?: SqlParams) => (params ?? []) as (string | number | null)[];
  return createSerializedDriver({
    async run(sql, params) {
      const r = db.prepare(sql).run(...p(params));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async get<T>(sql: string, params?: SqlParams) {
      return db.prepare(sql).get(...p(params)) as T | undefined;
    },
    async all<T>(sql: string, params?: SqlParams) {
      return db.prepare(sql).all(...p(params)) as T[];
    },
    async exec(sql) {
      db.exec(sql);
    },
  });
}

/** Relógio controlável. Datas em horário local da máquina (igual ao app). */
export class FakeClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return new Date(this.current);
  }
  set(d: Date): void {
    this.current = new Date(d);
  }
  advanceMinutes(min: number): void {
    this.current = new Date(this.current.getTime() + min * 60_000);
  }
}

/** Data/hora local: at(2026, 11, 18, 9, 30). Mês 1–12. */
export const at = (y: number, mo: number, d: number, h = 12, mi = 0) =>
  new Date(y, mo - 1, d, h, mi);

export async function setup(now: Date = at(2026, 11, 18)) {
  const db = createNodeDriver();
  await migrate(db);
  const clock = new FakeClock(now);
  let seq = 0;
  const ctx: RepoContext = { db, clock, newId: () => `id-${++seq}` };
  return { db, clock, repos: createRepositories(ctx) };
}
