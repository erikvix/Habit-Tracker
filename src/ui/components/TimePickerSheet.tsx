import { useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { fonts, space } from '../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';

interface Props {
  visible: boolean;
  /** Minuto do dia (0–1439). */
  value: number | null;
  onSelect: (minuteOfDay: number) => void;
  onClose: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Seletor de horário com as cores do app: hora (0–23) e minuto (de 5 em 5). */
export function TimePickerSheet({ visible, value, onSelect, onClose }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Horário">
      {/* Montado só enquanto aberto: o estado nasce do valor atual a cada abertura. */}
      {visible ? <TimeBody value={value} onSelect={onSelect} onClose={onClose} /> : null}
    </Sheet>
  );
}

function TimeBody({ value, onSelect, onClose }: Omit<Props, 'visible'>) {
  const { colors } = useTheme();
  const initial = value ?? 9 * 60;
  const [hour, setHour] = useState(Math.floor(initial / 60));
  const [minute, setMinute] = useState(initial % 60);

  return (
    <>
      <AppText
        style={{
          fontFamily: fonts.mono,
          fontSize: 32,
          fontWeight: '600',
          textAlign: 'center',
          color: colors.text,
        }}
      >
        {pad(hour)}:{pad(minute)}
      </AppText>
      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <AppText variant="muted" style={{ width: 56 }}>
            Hora
          </AppText>
          <Stepper label="hora" value={hour} min={0} max={23} onChange={setHour} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <AppText variant="muted" style={{ width: 56 }}>
            Minuto
          </AppText>
          <Stepper label="minuto" value={minute} min={0} max={59} step={5} onChange={setMinute} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button title="Cancelar" onPress={onClose} />
        </View>
        <View style={{ flex: 1 }}>
          <Button kind="primary" title="Definir" onPress={() => onSelect(hour * 60 + minute)} />
        </View>
      </View>
    </>
  );
}
