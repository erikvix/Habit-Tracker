import type { Repositories } from '@/data/repositories';

import { ACTION, parseData, type NotificationData } from './model';

export type ResponseOutcome =
  | { type: 'committed'; habitId: string }
  | { type: 'completed'; taskId: string }
  | { type: 'open'; data: NotificationData | null };

/**
 * Executa o botão tocado. Lembrete de outro dia (tocado depois da virada) não commita:
 * só abre o app, para não registrar no dia errado.
 */
export async function runResponse(
  repos: Repositories,
  actionIdentifier: string,
  rawData: unknown,
): Promise<ResponseOutcome> {
  const data = parseData(rawData);
  if (data?.kind === 'habit' && actionIdentifier === ACTION.commit) {
    if (data.date === (await repos.settings.today())) {
      await repos.commits.add(data.habitId, { source: 'notification' });
      return { type: 'committed', habitId: data.habitId };
    }
  }
  if (data?.kind === 'task' && actionIdentifier === ACTION.complete) {
    await repos.tasks.complete(data.taskId);
    return { type: 'completed', taskId: data.taskId };
  }
  return { type: 'open', data };
}
