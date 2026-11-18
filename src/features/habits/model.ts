/** Separa ativos e arquivados preservando a ordem do usuário. */
export function splitArchived<T extends { habit: { archivedAt?: string | null } }>(
  items: readonly T[],
): { active: T[]; archived: T[] } {
  const active: T[] = [];
  const archived: T[] = [];
  for (const it of items) (it.habit.archivedAt ? archived : active).push(it);
  return { active, archived };
}
