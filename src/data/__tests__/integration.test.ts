import { aggregateLevels, completedByDate } from '@/domain/aggregate';
import { monthEfficiency } from '@/domain/efficiency';
import { maskFromWeekdays } from '@/domain/schedule';
import { computeStreaks } from '@/domain/streaks';

import { at, setup } from './support';

/** Repositório → HabitHistory → regras do domínio, ponta a ponta. */
describe('integração repositório + domínio', () => {
  it('streak e eficiência a partir de commits reais, com meta trocada no mês', async () => {
    const { repos, clock } = await setup(at(2026, 11, 1, 8));
    const h = await repos.habits.create({
      name: 'Água',
      goalType: 'count',
      dailyTarget: 4,
      activeDays: 127,
    });

    // 1–10: 4 copos por dia (meta 4).
    for (let d = 1; d <= 10; d++) {
      clock.set(at(2026, 11, d, 8));
      for (let i = 0; i < 4; i++) await repos.commits.add(h.id);
    }
    // Dia 11: meta sobe para 8; faz 8 nos dias 11–17.
    clock.set(at(2026, 11, 11, 7));
    await repos.habits.setSchedule(h.id, { dailyTarget: 8, activeDays: 127 });
    for (let d = 11; d <= 17; d++) {
      clock.set(at(2026, 11, d, 8));
      for (let i = 0; i < 8; i++) await repos.commits.add(h.id);
    }
    // Hoje (18): só 3 → pendente.
    clock.set(at(2026, 11, 18, 8));
    for (let i = 0; i < 3; i++) await repos.commits.add(h.id);

    const history = await repos.habits.history(h.id);
    expect(computeStreaks(history, '2026-11-18')).toEqual({ current: 17, longest: 17 });
    expect(monthEfficiency(history, '2026-11', '2026-11-18')).toMatchObject({
      activeDays: 17,
      metDays: 17,
      efficiency: 1,
    });
  });

  it('gráfico geral: hábitos cumpridos + tarefas concluídas', async () => {
    const { repos } = await setup(at(2026, 11, 18, 9));
    const read = await repos.habits.create({
      name: 'Leitura',
      goalType: 'time',
      dailyTarget: 30,
      activeDays: maskFromWeekdays([1, 2, 3, 4, 5]),
    });
    const water = await repos.habits.create({
      name: 'Água',
      goalType: 'count',
      dailyTarget: 2,
      activeDays: 127,
    });
    await repos.commits.add(read.id, { value: 30 });
    await repos.commits.add(water.id); // 1/2 → não conta
    const t = await repos.tasks.create({ title: 'boleto' });
    await repos.tasks.complete(t.id);

    const range = { from: '2026-11-01', to: '2026-11-18' };
    const counts = completedByDate(
      await repos.habits.histories(range),
      await repos.tasks.completedBetween(range.from, range.to),
      range.from,
      range.to,
    );
    expect(counts.get('2026-11-18')).toBe(2);
    expect(aggregateLevels(counts).get('2026-11-18')?.level).toBe(4);
  });
});
