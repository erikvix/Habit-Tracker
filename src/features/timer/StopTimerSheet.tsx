import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Sheet } from '@/ui/components/Sheet';
import { Stepper } from '@/ui/components/Stepper';
import { space } from '@/ui/theme/tokens';

import { formatShortDate } from '../shared/model';
import { crossedDayStart, formatMinutes, suggestedMinutes } from './model';

export interface StopRequest {
  habitId: string;
  habitName: string;
  startedAt: string;
}

interface Props {
  request: StopRequest | null;
  now: Date;
  rolloverHour: number;
  busy?: boolean;
  onConfirm: (minutes: number) => void;
  onDiscard: () => void;
  onClose: () => void;
}

/** Confirmação ao parar: permite ajustar os minutos antes de registrar. */
export function StopTimerSheet({ request, ...rest }: Props) {
  return (
    <Sheet visible={request !== null} onClose={rest.onClose}>
      {request ? <StopBody key={request.startedAt} request={request} {...rest} /> : null}
    </Sheet>
  );
}

function StopBody({
  request,
  now,
  rolloverHour,
  busy,
  onConfirm,
  onDiscard,
  onClose,
}: Omit<Props, 'request'> & { request: StopRequest }) {
  // A sugestão é fixada no momento em que o painel abre.
  const [initial] = useState(() => suggestedMinutes(request.startedAt, now));
  const [minutes, setMinutes] = useState(initial);
  const crossed = crossedDayStart(request.startedAt, now, rolloverHour);

  if (initial < 1) {
    return (
      <>
        <AppText variant="heading">Sessão muito curta</AppText>
        <AppText variant="muted">Menos de 1 minuto: nada a registrar.</AppText>
        <Button kind="primary" title="OK" onPress={onDiscard} />
      </>
    );
  }

  return (
    <>
      <AppText variant="heading" accessibilityRole="header">
        Registrar {formatMinutes(minutes)} em {request.habitName}?
      </AppText>
      <View style={{ gap: space.xs }}>
        <AppText variant="muted">Ajuste se o cronômetro ficou rodando além da conta.</AppText>
        <Stepper
          label="minutos a registrar"
          value={minutes}
          min={1}
          max={1440}
          step={5}
          unit="min"
          onChange={setMinutes}
        />
      </View>
      {crossed ? (
        <AppText variant="caption">
          A sessão passou da virada do dia: conta em {formatShortDate(crossed)}, quando começou.
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button kind="danger" title="Descartar" disabled={busy} onPress={onDiscard} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            kind="primary"
            title="Registrar"
            disabled={busy || minutes < 1}
            onPress={() => onConfirm(minutes)}
          />
        </View>
      </View>
      <Button title="Continuar cronometrando" onPress={onClose} />
    </>
  );
}
