import { defaultSettings } from '../repositories/settingsRepo';
import { elapsedMinutes } from '../repositories/timerRepo';
import { at, setup } from './support';

describe('settingsRepo', () => {
  it('padrões: escuro, domingo, virada à meia-noite', async () => {
    const { repos } = await setup();
    expect(await repos.settings.getAll()).toEqual(defaultSettings);
    expect(defaultSettings).toEqual({ theme: 'dark', weekStart: 0, rolloverHour: 0 });
  });

  it('grava, sobrescreve e valida', async () => {
    const { repos } = await setup();
    await repos.settings.set('theme', 'light');
    await repos.settings.set('theme', 'system');
    await repos.settings.set('rolloverHour', 4);
    expect(await repos.settings.getAll()).toMatchObject({ theme: 'system', rolloverHour: 4 });
    // @ts-expect-error valor fora do tipo
    await expect(repos.settings.set('theme', 'blue')).rejects.toThrow('inválido');
    await expect(repos.settings.set('rolloverHour', 24)).rejects.toThrow('inválido');
  });

  it('valor corrompido no banco cai para o padrão', async () => {
    const { repos, db } = await setup();
    await db.run("INSERT INTO setting (key, value) VALUES ('theme', 'not json')");
    await db.run("INSERT INTO setting (key, value) VALUES ('weekStart', '5')");
    expect(await repos.settings.getAll()).toEqual(defaultSettings);
  });
});

describe('taskRepo', () => {
  it('cria, conclui no dia lógico e desfaz', async () => {
    const { repos } = await setup(at(2026, 11, 18, 22));
    const t = await repos.tasks.create({ title: ' Pagar boleto ', dueDate: '2026-11-18' });
    expect(t).toMatchObject({ title: 'Pagar boleto', completedLocalDate: null });
    await repos.tasks.complete(t.id);
    expect((await repos.tasks.get(t.id)).completedLocalDate).toBe('2026-11-18');
    await repos.tasks.uncomplete(t.id);
    expect(await repos.tasks.get(t.id)).toMatchObject({
      completedAt: null,
      completedLocalDate: null,
    });
  });

  it('concluir de novo mantém a data original', async () => {
    const { repos, clock } = await setup(at(2026, 11, 18));
    const t = await repos.tasks.create({ title: 'x' });
    await repos.tasks.complete(t.id);
    clock.set(at(2026, 11, 20));
    await repos.tasks.complete(t.id);
    expect((await repos.tasks.get(t.id)).completedLocalDate).toBe('2026-11-18');
  });

  it('filtros: hoje, atrasadas, abertas e concluídas', async () => {
    // A tarefa "atrasada" é criada no dia 05 com prazo dia 10; hoje é dia 18.
    const { repos, clock } = await setup(at(2026, 11, 5));
    const late = await repos.tasks.create({ title: 'atrasada', dueDate: '2026-11-10' });
    clock.set(at(2026, 11, 18));
    const today = await repos.tasks.create({
      title: 'hoje',
      dueDate: '2026-11-18',
      dueMinute: 600,
    });
    const free = await repos.tasks.create({ title: 'sem prazo' });
    const done = await repos.tasks.create({ title: 'feita', dueDate: '2026-11-18' });
    await repos.tasks.complete(done.id);

    const ids = async (f: 'open' | 'today' | 'overdue' | 'done') =>
      (await repos.tasks.list(f)).map((t) => t.id);
    expect(await ids('today')).toEqual([today.id]);
    expect(await ids('overdue')).toEqual([late.id]);
    expect(await ids('open')).toEqual([late.id, today.id, free.id]);
    expect(await ids('done')).toEqual([done.id]);
  });

  it('criar com prazo no passado é recusado; editar tarefa já atrasada é permitido', async () => {
    const { repos, clock } = await setup(at(2026, 11, 5));
    const t = await repos.tasks.create({ title: 'boleto', dueDate: '2026-11-10' });
    clock.set(at(2026, 11, 18));
    await expect(repos.tasks.create({ title: 'x', dueDate: '2026-11-17' })).rejects.toThrow(
      'passado',
    );
    await expect(repos.tasks.create({ title: 'x', dueDate: '2026-11-18' })).resolves.toBeTruthy();
    await repos.tasks.update(t.id, { title: 'boleto do condomínio' });
    expect(await repos.tasks.get(t.id)).toMatchObject({
      title: 'boleto do condomínio',
      dueDate: '2026-11-10',
    });
  });

  it('valida título e horário sem data; remover a data remove o horário', async () => {
    const { repos } = await setup();
    await expect(repos.tasks.create({ title: ' ' })).rejects.toThrow('Título');
    await expect(repos.tasks.create({ title: 'x', dueMinute: 60 })).rejects.toThrow('data');
    const t = await repos.tasks.create({ title: 'x', dueDate: '2026-11-20', dueMinute: 60 });
    await repos.tasks.update(t.id, { dueDate: null });
    expect(await repos.tasks.get(t.id)).toMatchObject({ dueDate: null, dueMinute: null });
  });

  it('completedBetween alimenta o agregado', async () => {
    const { repos, clock } = await setup(at(2026, 11, 10));
    const a = await repos.tasks.create({ title: 'a' });
    await repos.tasks.complete(a.id);
    clock.set(at(2026, 11, 18));
    const b = await repos.tasks.create({ title: 'b' });
    await repos.tasks.complete(b.id);
    await repos.tasks.create({ title: 'aberta' });
    expect(await repos.tasks.completedBetween('2026-11-15', '2026-11-30')).toEqual([
      { id: b.id, completedLocalDate: '2026-11-18' },
    ]);
  });
});

describe('timerRepo', () => {
  async function timeHabit(now = at(2026, 11, 18, 9)) {
    const env = await setup(now);
    const habit = await env.repos.habits.create({
      name: 'Leitura',
      goalType: 'time',
      dailyTarget: 30,
      activeDays: 127,
    });
    return { ...env, habit };
  }

  it('elapsedMinutes arredonda e nunca é negativo', () => {
    const start = at(2026, 11, 18, 9).toISOString();
    expect(elapsedMinutes(start, new Date(Date.parse(start) + 29_000))).toBe(0);
    expect(elapsedMinutes(start, new Date(Date.parse(start) + 31_000))).toBe(1);
    expect(elapsedMinutes(start, new Date(Date.parse(start) - 60_000))).toBe(0);
  });

  it('start é idempotente; stop gera commit de tempo', async () => {
    const { repos, habit, clock } = await timeHabit();
    const t1 = await repos.timers.start(habit.id);
    clock.advanceMinutes(3);
    expect(await repos.timers.start(habit.id)).toEqual(t1);
    clock.advanceMinutes(22);
    const r = await repos.timers.stop(habit.id);
    expect(r.minutes).toBe(25);
    expect(r.commit).toMatchObject({ value: 25, source: 'timer', localDate: '2026-11-18' });
    expect(await repos.timers.get(habit.id)).toBeNull();
  });

  it('sessão que atravessa a meia-noite conta no dia do início', async () => {
    const { repos, habit, clock } = await timeHabit(at(2026, 11, 18, 23, 40));
    await repos.timers.start(habit.id);
    clock.set(at(2026, 11, 19, 0, 20));
    const r = await repos.timers.stop(habit.id);
    expect(r.commit).toMatchObject({ value: 40, localDate: '2026-11-18' });
  });

  it('sessão < 1 min é descartada', async () => {
    const { repos, habit, clock } = await timeHabit();
    await repos.timers.start(habit.id);
    clock.advanceMinutes(0.4);
    expect(await repos.timers.stop(habit.id)).toEqual({ minutes: 0, commit: null });
    expect(await repos.commits.listByDay(habit.id, '2026-11-18')).toEqual([]);
  });

  it('só para hábitos de tempo; stop sem timer falha', async () => {
    const { repos, habit } = await timeHabit();
    const count = await repos.habits.create({
      name: 'Água',
      goalType: 'count',
      dailyTarget: 8,
      activeDays: 127,
    });
    await expect(repos.timers.start(count.id)).rejects.toThrow('tempo');
    await expect(repos.timers.stop(habit.id)).rejects.toThrow('Nenhum');
  });
});

describe('reminderRepo', () => {
  it('CRUD e listEnabled ignora desativados e hábitos arquivados', async () => {
    const { repos } = await setup();
    const mk = (name: string) =>
      repos.habits.create({ name, goalType: 'binary', dailyTarget: 1, activeDays: 127 });
    const a = await mk('a');
    const b = await mk('b');
    const r1 = await repos.reminders.add(a.id, 1200);
    await repos.reminders.add(a.id, 450);
    const r3 = await repos.reminders.add(b.id, 600);
    await repos.reminders.update(r1.id, { enabled: false });
    await repos.habits.archive(b.id);

    expect((await repos.reminders.listByHabit(a.id)).map((r) => r.minuteOfDay)).toEqual([
      450, 1200,
    ]);
    expect((await repos.reminders.listEnabled()).map((r) => r.minuteOfDay)).toEqual([450]);

    await repos.reminders.update(r3.id, { minuteOfDay: 615 });
    expect((await repos.reminders.listByHabit(b.id))[0]!.minuteOfDay).toBe(615);
    await expect(repos.reminders.add(a.id, 1440)).rejects.toThrow('Horário');
    await expect(repos.reminders.update('x', { enabled: true })).rejects.toThrow('não encontrado');
  });
});
