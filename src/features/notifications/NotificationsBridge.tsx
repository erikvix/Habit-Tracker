import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useRepositories } from '@/data/DatabaseProvider';
import { useDialog } from '@/ui/dialog/DialogProvider';

import { invalidateUserData } from '../shared/queries';
import { runResponse } from './actions';
import { setupNotifications, syncNotifications } from './service';

/**
 * Liga o app às notificações (sem UI):
 * - reconcilia o agendado ao abrir, ao voltar ao primeiro plano e após cada mutação;
 * - executa os botões "Commitar"/"Concluir" e navega no toque.
 */
export function NotificationsBridge() {
  const repos = useRepositories();
  const client = useQueryClient();
  const dialog = useDialog();
  const handled = useRef(new Set<string>());

  useEffect(() => {
    const sync = () =>
      void syncNotifications(repos)
        .then(() => client.invalidateQueries({ queryKey: ['notificationStatus'] }))
        .catch((e) => console.warn('[notificações] sync', e));
    void setupNotifications()
      .then(sync)
      .catch((e) => console.warn('[notificações] setup', e));

    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') sync();
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = client.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success') {
        clearTimeout(timer);
        timer = setTimeout(sync, 300);
      }
    });
    return () => {
      appState.remove();
      unsubscribe();
      clearTimeout(timer);
    };
  }, [repos, client]);

  useEffect(() => {
    const showError = dialog.showError('Não foi possível registrar');
    const handle = async (response: Notifications.NotificationResponse) => {
      const { request } = response.notification;
      const key = `${request.identifier}|${response.actionIdentifier}`;
      if (handled.current.has(key)) return;
      handled.current.add(key);
      Notifications.clearLastNotificationResponse();
      try {
        const outcome = await runResponse(repos, response.actionIdentifier, request.content.data);
        if (outcome.type === 'open') {
          router.navigate(outcome.data?.kind === 'task' ? '/tasks' : '/');
          return;
        }
        await Notifications.dismissNotificationAsync(request.identifier);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await invalidateUserData(client);
        void syncNotifications(repos);
        router.navigate(outcome.type === 'completed' ? '/tasks' : '/');
      } catch (e) {
        showError(e as Error);
      }
    };

    // App aberto pelo botão estando fechado: a resposta chega antes do listener.
    const last = Notifications.getLastNotificationResponse();
    if (last) void handle(last);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => void handle(r));
    return () => sub.remove();
  }, [repos, client, dialog]);

  return null;
}
