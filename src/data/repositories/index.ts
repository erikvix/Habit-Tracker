import type { RepoContext } from '../context';
import { createCommitRepo } from './commitRepo';
import { createHabitRepo } from './habitRepo';
import { createReminderRepo } from './reminderRepo';
import { createSettingsRepo } from './settingsRepo';
import { createTaskRepo } from './taskRepo';
import { createTimerRepo } from './timerRepo';

export function createRepositories(ctx: RepoContext) {
  const settings = createSettingsRepo(ctx);
  const commits = createCommitRepo(ctx, settings);
  return {
    settings,
    habits: createHabitRepo(ctx, settings),
    commits,
    tasks: createTaskRepo(ctx, settings),
    timers: createTimerRepo(ctx, settings, commits),
    reminders: createReminderRepo(ctx),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
