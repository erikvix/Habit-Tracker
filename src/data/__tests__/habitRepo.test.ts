import { maskFromWeekdays } from '@/domain/schedule';

import { at, setup } from './support';

const water = { name: '  Água ', goalType: 'count' as const, dailyTarget: 8, activeDays: 127 };

describe('habitRepo.create', () => {
  it('cria hábito com início hoje e primeira versão de meta', async () => {
    const { repos } = await setup(at(2026, 11, 18));
    const h = await repos.habits.create({ ...water, description: '  ' });
    expect(h).toMatchObject({
      name: 'Água',
      description: null,
      goalType: 'count',
      startDate: '2026-11-18',
      archivedAt: null,
      sortOrder: 0,
    });
    expect(await repos.habits.schedules(h.id)).toEqual([
      { habitId: h.id, effectiveFrom: '2026-11-18', dailyTarget: 8, activeDays: 127 },
    ]);
  });

  it('binário sempre tem meta 1', async () => {
    const { repos } = await setup();
    const h = await repos.habits.create({ ...water, goalType: 'binary', dailyTarget: 5 });
    expect((await repos.habits.schedules(h.id))[0]!.dailyTarget).toBe(1);
  });

  it('respeita a hora de virada para o dia de início', async () => {
    const { repos } = await setup(at(2026, 11, 18, 1, 30));
    await repos.settings.set('rolloverHour', 4);
    const h = await repos.habits.create(water);
    expect(h.startDate).toBe('2026-11-17');
  });

  it.each([
    [{ name: '   ' }, 'Nome'],
    [{ dailyTarget: 0 }, 'Meta'],
    [{ dailyTarget: 2.5 }, 'Meta'],
    [{ activeDays: 0 }, 'dia ativo'],
    [{ activeDays: 128 }, 'dia ativo'],
  ])('valida %p', async (patch, msg) => {
    const { repos } = await setup();
    await expect(repos.habits.create({ ...water, ...patch })).rejects.toThrow(msg);
  });

  it('sort_order incremental e lista sem arquivados por padrão', async () => {
    const { repos } = await setup();
    const a = await repos.habits.create({ ...water, name: 'A' });
    const b = await repos.habits.create({ ...water, name: 'B' });
    expect(b.sortOrder).toBe(1);
    await repos.habits.archive(a.id);
    expect((await repos.habits.list()).map((h) => h.name)).toEqual(['B']);
    expect(await repos.habits.list({ includeArchived: true })).toHaveLength(2);
    expect((await repos.habits.get(a.id)).archivedAt).toBe('2026-11-18');
    await repos.habits.unarchive(a.id);
    expect((await repos.habits.get(a.id)).archivedAt).toBeNull();
  });
});

describe('habitRepo.setSchedule (versionamento)', () => {
  it('mudança em outro dia cria nova versão; o passado fica intacto', async () => {
    const { repos, clock } = await setup(at(2026, 11, 1));
    const h = await repos.habits.create(water);
    clock.set(at(2026, 11, 15));
    expect(await repos.habits.setSchedule(h.id, { dailyTarget: 4, activeDays: 127 })).toBe(true);
    expect(
      (await repos.habits.schedules(h.id)).map((s) => [s.effectiveFrom, s.dailyTarget]),
    ).toEqual([
      ['2026-11-01', 8],
      ['2026-11-15', 4],
    ]);
  });

  it('mudar duas vezes no mesmo dia sobrescreve a versão do dia', async () => {
    const { repos, clock } = await setup(at(2026, 11, 1));
    const h = await repos.habits.create(water);
    clock.set(at(2026, 11, 15, 9));
    await repos.habits.setSchedule(h.id, { dailyTarget: 4, activeDays: 127 });
    clock.set(at(2026, 11, 15, 20));
    await repos.habits.setSchedule(h.id, { dailyTarget: 6, activeDays: maskFromWeekdays([1]) });
    const s = await repos.habits.schedules(h.id);
    expect(s).toHaveLength(2);
    expect(s[1]).toMatchObject({ effectiveFrom: '2026-11-15', dailyTarget: 6, activeDays: 2 });
  });

  it('sem mudança real → não cria versão', async () => {
    const { repos, clock } = await setup(at(2026, 11, 1));
    const h = await repos.habits.create(water);
    clock.set(at(2026, 11, 15));
    expect(await repos.habits.setSchedule(h.id, { dailyTarget: 8, activeDays: 127 })).toBe(false);
    expect(await repos.habits.schedules(h.id)).toHaveLength(1);
  });
});

describe('habitRepo.update / remove', () => {
  it('edita nome e descrição sem tocar no resto', async () => {
    const { repos } = await setup();
    const h = await repos.habits.create(water);
    await repos.habits.update(h.id, { description: 'copos de 250 ml' });
    await repos.habits.update(h.id, { name: 'Beber água' });
    expect(await repos.habits.get(h.id)).toMatchObject({
      name: 'Beber água',
      description: 'copos de 250 ml',
      goalType: 'count',
    });
  });

  it('erro claro para id inexistente', async () => {
    const { repos } = await setup();
    await expect(repos.habits.get('x')).rejects.toThrow('não encontrado');
    await expect(repos.habits.remove('x')).rejects.toThrow('não encontrado');
  });
});
