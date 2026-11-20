import { runResponse } from '@/features/notifications/actions';
import { ACTION } from '@/features/notifications/model';

import { setup } from './support';

const TODAY = '2026-11-18';

async function withHabit(goalType: 'binary' | 'count' = 'count') {
  const s = await setup();
  const habit = await s.repos.habits.create({
    name: 'Água',
    goalType,
    dailyTarget: goalType === 'binary' ? 1 : 8,
    activeDays: 127,
  });
  return { ...s, habit };
}

describe('runResponse', () => {
  it('Commitar registra +1 hoje com origem notificação', async () => {
    const { repos, habit } = await withHabit();
    const data = { kind: 'habit', habitId: habit.id, date: TODAY, sig: '' };
    expect(await runResponse(repos, ACTION.commit, data)).toEqual({
      type: 'committed',
      habitId: habit.id,
    });
    const day = await repos.commits.listByDay(habit.id, TODAY);
    expect(day.map((c) => [c.value, c.source])).toEqual([[1, 'notification']]);
  });

  it('sim/não já feito: tocar de novo não duplica', async () => {
    const { repos, habit } = await withHabit('binary');
    const data = { kind: 'habit', habitId: habit.id, date: TODAY, sig: '' };
    await runResponse(repos, ACTION.commit, data);
    await runResponse(repos, ACTION.commit, data);
    expect(await repos.commits.listByDay(habit.id, TODAY)).toHaveLength(1);
  });

  it('lembrete de ontem não commita hoje: só abre', async () => {
    const { repos, habit } = await withHabit();
    const data = { kind: 'habit', habitId: habit.id, date: '2026-11-17', sig: '' };
    expect((await runResponse(repos, ACTION.commit, data)).type).toBe('open');
    expect(await repos.commits.listByDay(habit.id, TODAY)).toHaveLength(0);
  });

  it('toque no corpo só abre', async () => {
    const { repos, habit } = await withHabit();
    const data = { kind: 'habit', habitId: habit.id, date: TODAY, sig: '' };
    const r = await runResponse(repos, 'expo.modules.notifications.actions.DEFAULT', data);
    expect(r).toMatchObject({ type: 'open', data: { habitId: habit.id } });
    expect(await repos.commits.listByDay(habit.id, TODAY)).toHaveLength(0);
  });

  it('Concluir fecha a tarefa', async () => {
    const { repos } = await setup();
    const t = await repos.tasks.create({ title: 'Pagar', dueDate: TODAY, dueMinute: 900 });
    await runResponse(repos, ACTION.complete, { kind: 'task', taskId: t.id, sig: '' });
    expect((await repos.tasks.list('open')).map((x) => x.id)).not.toContain(t.id);
  });

  it('hábito arquivado: erro de validação sobe para a UI', async () => {
    const { repos, habit } = await withHabit();
    await repos.habits.archive(habit.id);
    const data = { kind: 'habit', habitId: habit.id, date: TODAY, sig: '' };
    await expect(runResponse(repos, ACTION.commit, data)).rejects.toThrow('arquivado');
  });
});
