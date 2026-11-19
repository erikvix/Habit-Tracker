import { at, setup } from './support';

async function twoTimeHabits() {
  const env = await setup(at(2026, 11, 18, 9));
  const mk = (name: string) =>
    env.repos.habits.create({ name, goalType: 'time', dailyTarget: 30, activeDays: 127 });
  return { ...env, read: await mk('Leitura'), meditate: await mk('Meditação') };
}

describe('timerRepo — um por vez e minutos ajustados', () => {
  it('recusa iniciar um segundo cronômetro; libera depois de parar', async () => {
    const { repos, read, meditate, clock } = await twoTimeHabits();
    await repos.timers.start(read.id);
    await expect(repos.timers.start(meditate.id)).rejects.toThrow('rodando');
    // Iniciar o mesmo de novo continua idempotente.
    await expect(repos.timers.start(read.id)).resolves.toBeTruthy();
    clock.advanceMinutes(10);
    await repos.timers.stop(read.id);
    await expect(repos.timers.start(meditate.id)).resolves.toBeTruthy();
    expect((await repos.timers.listActive()).map((t) => t.habitId)).toEqual([meditate.id]);
  });

  it('stop com minutos ajustados registra o valor informado', async () => {
    const { repos, read, clock } = await twoTimeHabits();
    await repos.timers.start(read.id);
    clock.advanceMinutes(300); // esquecido rodando 5 h
    const r = await repos.timers.stop(read.id, 40);
    expect(r).toMatchObject({ minutes: 40, commit: { value: 40, source: 'timer' } });
  });

  it('stop recusa minutos fora de 1–1440 sem apagar o cronômetro', async () => {
    const { repos, read } = await twoTimeHabits();
    await repos.timers.start(read.id);
    await expect(repos.timers.stop(read.id, 0)).rejects.toThrow('Minutos');
    await expect(repos.timers.stop(read.id, 1441)).rejects.toThrow('Minutos');
    await expect(repos.timers.stop(read.id, 2.5)).rejects.toThrow('Minutos');
    expect(await repos.timers.get(read.id)).not.toBeNull();
  });
});
