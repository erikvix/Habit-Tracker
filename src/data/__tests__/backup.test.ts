import { backupFileName, backupSummary, BACKUP_TABLES } from '../repositories/backupRepo';
import { LATEST_SCHEMA_VERSION } from '../migrations';
import { at, setup } from './support';

describe('backupRepo.exportAll', () => {
  it('exporta todas as tabelas com linhas cruas, sem o cronômetro ativo', async () => {
    const { repos } = await setup(at(2026, 11, 25, 9, 0));
    const water = await repos.habits.create({
      name: 'Água',
      goalType: 'count',
      dailyTarget: 8,
      activeDays: 127,
    });
    const read = await repos.habits.create({
      name: 'Leitura',
      goalType: 'time',
      dailyTarget: 30,
      activeDays: 127,
    });
    await repos.commits.add(water.id);
    await repos.commits.add(water.id);
    await repos.reminders.setForHabit(water.id, [600]);
    await repos.tasks.create({ title: 'Pagar conta' });
    await repos.settings.set('theme', 'light');
    await repos.timers.start(read.id);

    const b = await repos.backup.exportAll();
    expect(b).toMatchObject({
      app: 'todo-tracker',
      format: 1,
      schemaVersion: LATEST_SCHEMA_VERSION,
    });
    expect(b.exportedAt).toBe(at(2026, 11, 25, 9, 0).toISOString());
    expect(Object.keys(b.tables)).toEqual([...BACKUP_TABLES]);
    expect(b.tables).not.toHaveProperty('active_timer');
    expect(backupSummary(b)).toEqual({ habits: 2, commits: 2, tasks: 1 });
    expect(b.tables.habit_schedule).toHaveLength(2);
    expect(b.tables.reminder[0]).toMatchObject({ habit_id: water.id, minute_of_day: 600 });
    expect(b.tables.setting).toEqual([{ key: 'theme', value: '"light"' }]);
    expect(b.tables.commit_entry[0]).toMatchObject({ habit_id: water.id, source: 'quick' });

    // Serializa e volta sem perda.
    expect(JSON.parse(JSON.stringify(b))).toEqual(b);
  });

  it('banco vazio: tabelas vazias', async () => {
    const { repos } = await setup();
    const b = await repos.backup.exportAll();
    expect(backupSummary(b)).toEqual({ habits: 0, commits: 0, tasks: 0 });
  });
});

describe('backupFileName', () => {
  it('usa a data local', () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 59))).toBe(
      'todo-tracker-backup-2026-01-05.json',
    );
  });
});
