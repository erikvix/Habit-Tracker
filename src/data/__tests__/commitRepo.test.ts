import { at, setup } from './support';

async function withHabit(goalType: 'binary' | 'count' | 'time', now = at(2026, 11, 18)) {
  const env = await setup(now);
  const habit = await env.repos.habits.create({
    name: goalType,
    goalType,
    dailyTarget: goalType === 'time' ? 30 : goalType === 'count' ? 8 : 1,
    activeDays: 127,
  });
  return { ...env, habit };
}

describe('commitRepo.add', () => {
  it('grava data lógica, valor, fuso e origem', async () => {
    const { repos, habit } = await withHabit('time');
    const c = await repos.commits.add(habit.id, { value: 25, source: 'manual' });
    expect(c).toMatchObject({ localDate: '2026-11-18', value: 25, source: 'manual' });
    expect(c.tzOffsetMin).toBe(-at(2026, 11, 18).getTimezoneOffset());
  });

  it('01:30 com virada às 4h cai no dia anterior', async () => {
    const { repos, habit, clock } = await withHabit('count', at(2026, 11, 17, 10));
    await repos.settings.set('rolloverHour', 4);
    clock.set(at(2026, 11, 18, 1, 30));
    expect((await repos.commits.add(habit.id)).localDate).toBe('2026-11-17');
  });

  it('binário: no máximo 1 commit por dia', async () => {
    const { repos, habit } = await withHabit('binary');
    const a = await repos.commits.add(habit.id);
    const b = await repos.commits.add(habit.id);
    expect(b.id).toBe(a.id);
    expect(await repos.commits.listByDay(habit.id, '2026-11-18')).toHaveLength(1);
  });

  it('contagem: cada commit vale 1, independente do valor pedido', async () => {
    const { repos, habit } = await withHabit('count');
    await repos.commits.add(habit.id, { value: 5 });
    await repos.commits.add(habit.id);
    const h = await repos.habits.history(habit.id);
    expect(h.progress.get('2026-11-18')).toBe(2);
  });

  it('tempo: valida minutos', async () => {
    const { repos, habit } = await withHabit('time');
    await expect(repos.commits.add(habit.id, { value: 0 })).rejects.toThrow('Minutos');
    await expect(repos.commits.add(habit.id, { value: 1441 })).rejects.toThrow('Minutos');
  });

  it('hábito inexistente', async () => {
    const { repos } = await withHabit('count');
    await expect(repos.commits.add('nope')).rejects.toThrow('não encontrado');
  });
});

describe('commitRepo.removeLast (−1 / desfazer)', () => {
  it('remove o mais recente do dia; false quando não há', async () => {
    const { repos, habit, clock } = await withHabit('time');
    await repos.commits.add(habit.id, { value: 10 });
    clock.advanceMinutes(5);
    await repos.commits.add(habit.id, { value: 20 });
    expect(await repos.commits.removeLast(habit.id)).toBe(true);
    expect((await repos.commits.listByDay(habit.id, '2026-11-18')).map((c) => c.value)).toEqual([
      10,
    ]);
    expect(await repos.commits.removeLast(habit.id)).toBe(true);
    expect(await repos.commits.removeLast(habit.id)).toBe(false);
  });

  it('desempata commits no mesmo instante pela ordem de inserção', async () => {
    const { repos, habit } = await withHabit('time');
    await repos.commits.add(habit.id, { value: 1 });
    await repos.commits.add(habit.id, { value: 2 });
    await repos.commits.removeLast(habit.id);
    expect((await repos.commits.listByDay(habit.id, '2026-11-18'))[0]!.value).toBe(1);
  });
});

describe('commitRepo.addOnDate (edição de histórico)', () => {
  it('commit retroativo antes do início puxa start_date e a primeira vigência', async () => {
    const { repos, habit } = await withHabit('count');
    await repos.commits.addOnDate(habit.id, '2026-11-10');
    expect((await repos.habits.get(habit.id)).startDate).toBe('2026-11-10');
    expect((await repos.habits.schedules(habit.id))[0]!.effectiveFrom).toBe('2026-11-10');
  });

  it('não altera vigências posteriores', async () => {
    const { repos, clock } = await setup(at(2026, 11, 1));
    const h = await repos.habits.create({
      name: 'x',
      goalType: 'count',
      dailyTarget: 8,
      activeDays: 127,
    });
    clock.set(at(2026, 11, 15));
    await repos.habits.setSchedule(h.id, { dailyTarget: 4, activeDays: 127 });
    await repos.commits.addOnDate(h.id, '2026-10-20');
    expect((await repos.habits.schedules(h.id)).map((s) => s.effectiveFrom)).toEqual([
      '2026-10-20',
      '2026-11-15',
    ]);
  });

  it('recusa data futura e data inválida', async () => {
    const { repos, habit } = await withHabit('count');
    await expect(repos.commits.addOnDate(habit.id, '2026-11-19')).rejects.toThrow('futuro');
    await expect(repos.commits.addOnDate(habit.id, '2026-02-30')).rejects.toThrow('inválida');
  });
});

describe('commitRepo: edição e contagem', () => {
  it('updateValue (tempo) e remove', async () => {
    const { repos, habit } = await withHabit('time');
    const c = await repos.commits.add(habit.id, { value: 10 });
    await repos.commits.updateValue(c.id, 45);
    expect((await repos.commits.listByDay(habit.id, '2026-11-18'))[0]!.value).toBe(45);
    await repos.commits.remove(c.id);
    expect(await repos.commits.listByDay(habit.id, '2026-11-18')).toEqual([]);
    await expect(repos.commits.remove(c.id)).rejects.toThrow('não encontrado');
  });

  it('countByDate conta commits (não minutos)', async () => {
    const { repos, habit } = await withHabit('time');
    await repos.commits.add(habit.id, { value: 10 });
    await repos.commits.add(habit.id, { value: 20 });
    await repos.commits.addOnDate(habit.id, '2026-11-01', 5);
    const counts = await repos.commits.countByDate(habit.id, '2026-11-01', '2026-11-30');
    expect(Object.fromEntries(counts)).toEqual({ '2026-11-01': 1, '2026-11-18': 2 });
  });
});
