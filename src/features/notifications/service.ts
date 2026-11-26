import * as Notifications from 'expo-notifications';

import type { Repositories } from '@/data/repositories';
import { toLocalDate } from '@/domain/localDate';

import {
  ACTION,
  CATEGORY,
  CHANNEL_ID,
  parseData,
  planNotifications,
  reconcile,
  scheduledAt,
} from './model';

/** Canal, categorias (botões) e comportamento com o app aberto. Idempotente. */
export async function setupNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Lembretes',
    description: 'Lembretes de hábitos e prazos de tarefas',
    // eslint-disable-next-line import/namespace -- exportado em runtime (build/index.js); o plugin não lê o enum compilado
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#39d353',
  });
  // Os botões abrem o app: a ação roda com o app em primeiro plano (confiável no Android).
  await Notifications.setNotificationCategoryAsync(CATEGORY.commit, [
    { identifier: ACTION.commit, buttonTitle: 'Commitar', options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORY.task, [
    {
      identifier: ACTION.complete,
      buttonTitle: 'Concluir',
      options: { opensAppToForeground: true },
    },
  ]);
}

export type PermissionState = 'granted' | 'undetermined' | 'denied';

export async function getPermission(): Promise<PermissionState> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

/** Pede permissão se ainda der; true se concedida. */
export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function doSync(repos: Repositories): Promise<void> {
  if ((await getPermission()) !== 'granted') return;
  const now = new Date();
  const today = toLocalDate(now);

  const reminders = await repos.reminders.listEnabled();
  const byHabit = new Map<string, number[]>();
  for (const r of reminders)
    byHabit.set(r.habitId, [...(byHabit.get(r.habitId) ?? []), r.minuteOfDay]);
  const histories =
    byHabit.size > 0 ? await repos.habits.histories({ from: today, to: today }) : [];
  const tasks = await repos.tasks.list('open');

  const planned = planNotifications({
    now,
    habits: histories
      .filter((h) => byHabit.has(h.habit.id))
      .map((history) => ({ history, reminders: byHabit.get(history.habit.id)! })),
    tasks,
  });

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const diff = reconcile(
    planned,
    scheduled.map((s) => ({
      id: s.identifier,
      sig: parseData(s.content.data)?.sig,
    })),
  );

  for (const id of diff.cancel) await Notifications.cancelScheduledNotificationAsync(id);
  for (const p of diff.schedule) {
    await Notifications.scheduleNotificationAsync({
      identifier: p.id,
      content: {
        title: p.title,
        body: p.body,
        data: p.data as unknown as Record<string, unknown>,
        categoryIdentifier: p.category,
        color: '#39d353',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: p.at,
        channelId: CHANNEL_ID,
      },
    });
  }
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Reconcilia o agendado com o estado atual. Chamadas concorrentes se juntam:
 * se já há uma rodando, roda mais uma vez no fim (com os dados mais novos).
 */
export function syncNotifications(repos: Repositories): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await doSync(repos);
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

export interface ScheduledItem {
  id: string;
  at: number;
  title: string;
}

/** Próximos lembretes do app no sistema, em ordem de disparo (diagnóstico em Ajustes). */
export async function listScheduled(): Promise<ScheduledItem[]> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all
    .map((n) => ({
      id: n.identifier,
      at: scheduledAt(n.identifier),
      title: n.content.title ?? '',
    }))
    .filter((n): n is ScheduledItem => n.at !== null)
    .sort((a, b) => a.at - b.at);
}

/**
 * Notificação de teste em ~1 min, no mesmo canal e com o botão Commitar.
 * O id fica fora dos prefixos do app, então a reconciliação não a cancela.
 */
export async function scheduleTestNotification(): Promise<Date> {
  const at = new Date(Date.now() + 60_000);
  await Notifications.scheduleNotificationAsync({
    identifier: `test:${at.getTime()}`,
    content: {
      title: 'Teste do Todo Tracker',
      body: 'Se você está vendo isto, os lembretes chegam com o app fechado.',
      data: { kind: 'test' },
      categoryIdentifier: CATEGORY.commit,
      color: '#39d353',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at.getTime(),
      channelId: CHANNEL_ID,
    },
  });
  return at;
}
