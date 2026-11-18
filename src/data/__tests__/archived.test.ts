import { at, setup } from './support';

/** Hábito arquivado é só leitura: métricas congeladas até desarquivar. */
describe('hábito arquivado', () => {
  async function archivedHabit(goalType: 'count' | 'time' = 'count') {
    const env = await setup(at(2026, 11, 18));
    const habit = await env.repos.habits.create({
      name: 'x',
      goalType,
      dailyTarget: goalType === 'time' ? 30 : 8,
      activeDays: 127,
    });
    const c = await env.repos.commits.add(habit.id, { value: 10 });
    await env.repos.habits.archive(habit.id);
    return { ...env, habit, commit: c };
  }

  it('bloqueia commit, commit retroativo, −1, edição e remoção', async () => {
    const { repos, habit, commit } = await archivedHabit('time');
    const msg = 'arquivado';
    await expect(repos.commits.add(habit.id)).rejects.toThrow(msg);
    await expect(repos.commits.addOnDate(habit.id, '2026-11-10', 5)).rejects.toThrow(msg);
    await expect(repos.commits.removeLast(habit.id)).rejects.toThrow(msg);
    await expect(repos.commits.updateValue(commit.id, 20)).rejects.toThrow(msg);
    await expect(repos.commits.remove(commit.id)).rejects.toThrow(msg);
    await expect(repos.timers.start(habit.id)).rejects.toThrow(msg);
    expect(await repos.commits.listByDay(habit.id, '2026-11-18')).toHaveLength(1);
  });

  it('desarquivar libera a edição', async () => {
    const { repos, habit } = await archivedHabit();
    await repos.habits.unarchive(habit.id);
    await expect(repos.commits.add(habit.id)).resolves.toBeTruthy();
  });
});
