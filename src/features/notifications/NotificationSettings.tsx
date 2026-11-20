import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, Linking, View } from 'react-native';

import { useRepositories } from '@/data/DatabaseProvider';
import { defaultSettings } from '@/data/repositories/settingsRepo';
import { toLocalDate } from '@/domain/localDate';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space } from '@/ui/theme/tokens';

import { formatShortDate } from '../shared/model';
import { useSettings } from '../shared/queries';
import {
  ensurePermission,
  getPermission,
  listScheduled,
  scheduleTestNotification,
  syncNotifications,
  type PermissionState,
} from './service';

const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
/** "qua, 19 nov · 16:10" (dia de calendário, não o lógico). */
const whenLabel = (ms: number) => {
  const d = new Date(ms);
  return `${formatShortDate(toLocalDate(d, 0))} · ${hhmm(d)}`;
};

const KEY = ['notificationStatus'] as const;

const LABEL: Record<PermissionState, string> = {
  granted: 'Permitidas',
  undetermined: 'Ainda não permitidas',
  denied: 'Bloqueadas no Android',
};

/** Card de Ajustes: permissão, próximos lembretes agendados e teste de entrega. */
export function NotificationSettings() {
  const { colors } = useTheme();
  const repos = useRepositories();
  const client = useQueryClient();
  const { data: settings = defaultSettings } = useSettings();
  const [testAt, setTestAt] = useState<Date | null>(null);
  const status = useQuery({
    queryKey: [...KEY, settings.rolloverHour],
    queryFn: async () => ({
      permission: await getPermission(),
      scheduled: await listScheduled(settings.rolloverHour),
    }),
  });

  // Volta das configurações do Android: relê a permissão.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void client.invalidateQueries({ queryKey: KEY });
    });
    return () => sub.remove();
  }, [client]);

  const permission = status.data?.permission;
  const test = async () => {
    setTestAt(await scheduleTestNotification());
  };
  const allow = async () => {
    if (await ensurePermission()) await syncNotifications(repos);
    await client.invalidateQueries({ queryKey: KEY });
  };

  return (
    <Card style={{ gap: space.md }}>
      <AppText variant="heading">Notificações</AppText>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
        <AppText variant="muted">Status</AppText>
        <AppText
          style={{
            fontWeight: '600',
            color:
              permission === 'granted'
                ? colors.success
                : permission === 'denied'
                  ? colors.danger
                  : colors.attention,
          }}
        >
          {permission ? LABEL[permission] : '…'}
        </AppText>
      </View>
      {permission === 'granted' ? (
        <>
          <AppText variant="caption">
            {status.data!.scheduled.length} lembrete(s) agendado(s) para os próximos 14 dias. Abra o
            app de vez em quando para renovar a agenda.
          </AppText>
          {status.data!.scheduled.length > 0 ? (
            <View style={{ gap: space.xs }}>
              <AppText variant="muted" style={{ fontWeight: '600' }}>
                Próximos
              </AppText>
              {status.data!.scheduled.slice(0, 5).map((n) => (
                <View
                  key={n.id}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}
                >
                  <AppText variant="mono" style={{ color: colors.textMuted }}>
                    {whenLabel(n.at)}
                  </AppText>
                  <AppText numberOfLines={1} style={{ flexShrink: 1 }}>
                    {n.title}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
          <Button icon="bell" title="Testar notificação (1 min)" onPress={() => void test()} />
          {testAt ? (
            <AppText variant="caption">
              Teste agendado para {hhmm(testAt)}. Feche o app (sem forçar parada) e aguarde.
            </AppText>
          ) : null}
        </>
      ) : null}
      {permission === 'undetermined' ? (
        <Button kind="primary" icon="bell" title="Permitir notificações" onPress={allow} />
      ) : null}
      {permission === 'denied' ? (
        <Button
          icon="gear"
          title="Abrir configurações do Android"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}
    </Card>
  );
}
