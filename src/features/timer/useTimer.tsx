import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useRepositories } from '@/data/DatabaseProvider';
import { defaultSettings } from '@/data/repositories/settingsRepo';
import { useDialog } from '@/ui/dialog/DialogProvider';

import { invalidateUserData, useSettings } from '../shared/queries';
import { formatElapsed } from './model';
import { StopTimerSheet, type StopRequest } from './StopTimerSheet';

/** Relógio que só "anda" (1×/s) enquanto `active`; fora isso não há timer gastando bateria. */
export function useNow(active: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [active]);
  return now;
}

interface Options {
  /** Decide a vibração ao registrar: "sucesso" se bater a meta do dia. */
  reachesGoal?: (habitId: string, minutes: number) => boolean;
}

/**
 * Cronômetro (um por vez): estado ao vivo, iniciar/parar/descartar com os diálogos.
 * Quem usa renderiza `sheet` uma vez na tela.
 */
export function useTimer({ reachesGoal }: Options = {}) {
  const repos = useRepositories();
  const client = useQueryClient();
  const dialog = useDialog();
  const { data: settings = defaultSettings } = useSettings();
  const showError = dialog.showError('Não foi possível salvar');
  const onSuccess = () => invalidateUserData(client);

  const timers = useQuery({ queryKey: ['timers'], queryFn: () => repos.timers.listActive() });
  const active = timers.data?.[0] ?? null;
  const now = useNow(active !== null);
  const [stopping, setStopping] = useState<StopRequest | null>(null);

  const startM = useMutation({ mutationFn: (id: string) => repos.timers.start(id), onSuccess });
  const stopM = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes?: number }) =>
      repos.timers.stop(id, minutes),
    onSuccess,
  });
  const cancelM = useMutation({ mutationFn: (id: string) => repos.timers.cancel(id), onSuccess });
  const busy = startM.isPending || stopM.isPending || cancelM.isPending;

  const start = async (habit: { id: string; name: string }) => {
    if (active && active.habitId !== habit.id) {
      const ok = await dialog.confirm({
        title: `Parar ${active.habitName} e iniciar ${habit.name}?`,
        message: `O tempo de ${active.habitName} (${formatElapsed(
          now.getTime() - Date.parse(active.startedAt),
        )}) será registrado. Só um cronômetro roda por vez.`,
        confirmLabel: 'Trocar',
      });
      if (!ok) return;
      try {
        await stopM.mutateAsync({ id: active.habitId });
      } catch (e) {
        showError(e as Error);
        return;
      }
    }
    startM.mutate(habit.id, {
      onSuccess: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
      onError: showError,
    });
  };

  const requestStop = () => {
    if (active) {
      setStopping({
        habitId: active.habitId,
        habitName: active.habitName,
        startedAt: active.startedAt,
      });
    }
  };

  const discard = async () => {
    if (!active) return;
    const ok = await dialog.confirm({
      title: 'Descartar cronômetro?',
      message: `O tempo de ${active.habitName} não será registrado.`,
      confirmLabel: 'Descartar',
      destructive: true,
    });
    if (ok) cancelM.mutate(active.habitId, { onError: showError });
  };

  const sheet = (
    <StopTimerSheet
      request={stopping}
      now={now}
      rolloverHour={settings.rolloverHour}
      busy={busy}
      onClose={() => setStopping(null)}
      onDiscard={() => {
        const req = stopping;
        setStopping(null);
        if (req) cancelM.mutate(req.habitId, { onError: showError });
      }}
      onConfirm={(minutes) => {
        const req = stopping;
        if (!req) return;
        stopM.mutate(
          { id: req.habitId, minutes },
          {
            onSuccess: () => {
              setStopping(null);
              void (reachesGoal?.(req.habitId, minutes)
                ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
            },
            onError: showError,
          },
        );
      }}
    />
  );

  const elapsed = active ? formatElapsed(now.getTime() - Date.parse(active.startedAt)) : null;
  return { active, elapsed, busy, start, requestStop, discard, sheet };
}

export type TimerApi = ReturnType<typeof useTimer>;
