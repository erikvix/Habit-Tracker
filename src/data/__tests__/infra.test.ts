import { createSerializedDriver } from '../driver';
import { getSchemaVersion, LATEST_SCHEMA_VERSION, migrate } from '../migrations';
import { createNodeDriver, setup } from './support';

describe('migrations', () => {
  it('cria o schema do zero e registra a versão', async () => {
    const db = createNodeDriver();
    expect(await getSchemaVersion(db)).toBe(0);
    expect(await migrate(db)).toBe(LATEST_SCHEMA_VERSION);
    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual([
      'active_timer',
      'commit_entry',
      'habit',
      'habit_schedule',
      'reminder',
      'setting',
      'task',
    ]);
  });

  it('reaplicar é idempotente', async () => {
    const db = createNodeDriver();
    await migrate(db);
    await expect(migrate(db)).resolves.toBe(LATEST_SCHEMA_VERSION);
  });

  it('migration com erro faz rollback e não avança a versão', async () => {
    const db = createNodeDriver();
    await migrate(db);
    const broken = [{ version: LATEST_SCHEMA_VERSION + 1, up: 'CREATE TABLE x (a); SELEC 1;' }];
    await expect(migrate(db, broken)).rejects.toThrow();
    expect(await getSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
    expect(await db.get("SELECT 1 FROM sqlite_master WHERE name = 'x'")).toBeUndefined();
  });

  it('foreign_keys ativo: excluir hábito apaga dependentes em cascata', async () => {
    const { repos, db } = await setup();
    const h = await repos.habits.create({
      name: 'Leitura',
      goalType: 'time',
      dailyTarget: 30,
      activeDays: 127,
    });
    await repos.commits.add(h.id, { value: 10 });
    await repos.reminders.add(h.id, 450);
    await repos.timers.start(h.id);
    await repos.habits.remove(h.id);
    for (const t of ['habit_schedule', 'commit_entry', 'reminder', 'active_timer']) {
      expect(await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`)).toEqual({ n: 0 });
    }
  });
});

describe('createSerializedDriver', () => {
  it('rollback quando a transação rejeita', async () => {
    const { db } = await setup();
    await expect(
      db.transaction(async (tx) => {
        await tx.run("INSERT INTO setting (key, value) VALUES ('k', '1')");
        throw new Error('falhou');
      }),
    ).rejects.toThrow('falhou');
    expect(await db.get("SELECT * FROM setting WHERE key = 'k'")).toBeUndefined();
  });

  it('operações concorrentes não entram na transação em andamento', async () => {
    const log: string[] = [];
    const raw = {
      run: async (sql: string) => {
        log.push(sql);
        return { changes: 0, lastInsertRowId: 0 };
      },
      get: async () => undefined,
      all: async () => [],
      exec: async (sql: string) => {
        log.push(sql);
      },
    };
    const db = createSerializedDriver(raw);
    const tx = db.transaction(async (t) => {
      await t.run('A');
      await new Promise((r) => setTimeout(r, 5));
      await t.run('B');
    });
    const outside = db.run('FORA');
    await Promise.all([tx, outside]);
    expect(log).toEqual(['BEGIN IMMEDIATE', 'A', 'B', 'COMMIT', 'FORA']);
  });

  it('uma falha não trava a fila', async () => {
    const { db } = await setup();
    await expect(db.run('SELEC 1')).rejects.toThrow();
    await expect(db.get<{ v: number }>('SELECT 1 AS v')).resolves.toEqual({ v: 1 });
  });
});
