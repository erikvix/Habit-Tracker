import { createHabitEvaluator } from '@/domain/habitDay';

import { at, setup } from './support';

/** Fluxos da Fase 4: editar meta no meio do mês e corrigir dias passados. */
describe('histórico', () => {
  it('editar a meta preserva o nível dos dias anteriores', async () => {
    const { repos, clock } = await setup(at(2026, 11, 1, 9));
    const h = await repos.habits.create({
      name: 'Água',
      goalType: 'count',
      dailyTarget: 8,
      activeDays: 127,
    });
    for (let i = 0; i < 4; i++) await repos.commits.add(h.id); // 4/8 em 01/11 → nível 3

    clock.set(at(2026, 11, 15, 9));
    await repos.habits.update(h.id, { name: 'Beber água' });
    await repos.habits.setSchedule(h.id, { dailyTarget: 4, activeDays: 127 });
    for (let i = 0; i < 4; i++) await repos.commits.add(h.id); // 4/4 em 15/11 → nível 4

    const ev = createHabitEvaluator(await repos.habits.history(h.id));
    expect(ev('2026-11-01')).toMatchObject({ target: 8, level: 3, met: false });
    expect(ev('2026-11-15')).toMatchObject({ target: 4, level: 4, met: true });
    expect((await repos.habits.get(h.id)).name).toBe('Beber água');
  });

  it('corrigir um dia passado: adicionar, editar minutos e remover', async () => {
    const { repos } = await setup(at(2026, 11, 18, 9));
    const h = await repos.habits.create({
      name: 'Leitura',
      goalType: 'time',
      dailyTarget: 30,
      activeDays: 127,
    });
    const a = await repos.commits.addOnDate(h.id, '2026-11-10', 20);
    await repos.commits.addOnDate(h.id, '2026-11-10', 15);
    await repos.commits.updateValue(a.id, 10);
    let day = await repos.commits.listByDay(h.id, '2026-11-10');
    expect(day.map((c) => [c.value, c.source])).toEqual([
      [10, 'edit'],
      [15, 'edit'],
    ]);
    await repos.commits.remove(a.id);
    day = await repos.commits.listByDay(h.id, '2026-11-10');
    expect(day.map((c) => c.value)).toEqual([15]);
    // O início foi puxado para o dia corrigido.
    expect((await repos.habits.get(h.id)).startDate).toBe('2026-11-10');
  });
});
