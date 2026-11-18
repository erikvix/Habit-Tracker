/**
 * Abstração mínima de SQL usada pelos repositórios.
 * Implementações: expo-sqlite (app) e node:sqlite (testes).
 * Parâmetros sempre posicionais (`?`).
 */

export type SqlValue = string | number | null;
export type SqlParams = readonly SqlValue[];

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface SqlExecutor {
  run(sql: string, params?: SqlParams): Promise<RunResult>;
  get<T>(sql: string, params?: SqlParams): Promise<T | undefined>;
  all<T>(sql: string, params?: SqlParams): Promise<T[]>;
  /** Vários comandos, sem parâmetros (DDL, PRAGMA). */
  exec(sql: string): Promise<void>;
}

export interface SqlDriver extends SqlExecutor {
  /**
   * Executa `fn` numa transação. Todas as queries da transação devem usar `tx`.
   * Commit ao resolver, rollback ao rejeitar.
   */
  transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}

/**
 * Serializa todas as operações numa única conexão.
 *
 * Motivo: no expo-sqlite, `withTransactionAsync` deixa queries externas entrarem
 * na transação, e `withExclusiveTransactionAsync` abre outra conexão (sem
 * `foreign_keys = ON`). Uma fila própria + BEGIN/COMMIT manual mantém a mesma
 * conexão (FK ativo) e garante isolamento entre operações do app.
 */
export function createSerializedDriver(raw: SqlExecutor): SqlDriver {
  let queue: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(op: () => Promise<T>): Promise<T> => {
    const result = queue.then(op, op);
    queue = result.catch(() => undefined);
    return result;
  };

  return {
    run: (sql, params) => enqueue(() => raw.run(sql, params)),
    get: <T>(sql: string, params?: SqlParams) => enqueue(() => raw.get<T>(sql, params)),
    all: <T>(sql: string, params?: SqlParams) => enqueue(() => raw.all<T>(sql, params)),
    exec: (sql) => enqueue(() => raw.exec(sql)),
    transaction: <T>(fn: (tx: SqlExecutor) => Promise<T>) =>
      enqueue(async () => {
        await raw.exec('BEGIN IMMEDIATE');
        try {
          const value = await fn(raw);
          await raw.exec('COMMIT');
          return value;
        } catch (err) {
          await raw.exec('ROLLBACK');
          throw err;
        }
      }),
  };
}
