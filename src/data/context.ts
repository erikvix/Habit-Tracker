import type { SqlDriver } from './driver';

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

/** Dependências injetadas nos repositórios (relógio e IDs fixos nos testes). */
export interface RepoContext {
  db: SqlDriver;
  clock: Clock;
  newId: () => string;
}

export class ValidationError extends Error {
  override name = 'ValidationError';
}

export class NotFoundError extends Error {
  override name = 'NotFoundError';
}
