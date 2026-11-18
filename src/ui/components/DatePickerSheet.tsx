import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { buildMonthGrid, weekdayOrder } from '@/domain/calendar';
import { addMonths, monthKey } from '@/domain/localDate';
import type { LocalDate, MonthKey, Weekday } from '@/domain/types';
import { monthLongLabel } from '@/features/shared/model';

import { useTheme } from '../theme/ThemeProvider';
import { fonts, radius, space } from '../theme/tokens';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { Sheet } from './Sheet';

const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

interface Props {
  visible: boolean;
  value: LocalDate | null;
  today: LocalDate;
  /** Dias antes desta data ficam desabilitados. */
  minDate?: LocalDate;
  weekStart?: Weekday;
  onSelect: (date: LocalDate) => void;
  onClose: () => void;
}

/** Calendário com as cores do app (substitui o seletor nativo do Android). */
export function DatePickerSheet({ visible, onClose, ...rest }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      {/* Montado só enquanto aberto: abre sempre no mês do valor atual. */}
      {visible ? <CalendarBody {...rest} /> : null}
    </Sheet>
  );
}

function CalendarBody({
  value,
  today,
  minDate,
  weekStart = 0,
  onSelect,
}: Omit<Props, 'visible' | 'onClose'>) {
  const { colors } = useTheme();
  const [month, setMonth] = useState<MonthKey>(monthKey(value ?? today));
  const canGoBack = !minDate || addMonths(month, -1) >= monthKey(minDate);
  const cell = 40;

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconButton
          icon="chevron-left"
          kind="invisible"
          accessibilityLabel="Mês anterior"
          disabled={!canGoBack}
          onPress={() => setMonth((m) => addMonths(m, -1))}
        />
        <AppText variant="heading" style={{ flex: 1, textAlign: 'center' }}>
          {monthLongLabel(month)}
        </AppText>
        <IconButton
          icon="chevron-right"
          kind="invisible"
          accessibilityLabel="Próximo mês"
          onPress={() => setMonth((m) => addMonths(m, 1))}
        />
      </View>

      <View style={{ gap: space.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {weekdayOrder(weekStart).map((d) => (
            <AppText key={d} variant="caption" style={{ width: cell, textAlign: 'center' }}>
              {DOW[d]}
            </AppText>
          ))}
        </View>
        {buildMonthGrid(month, weekStart).map((week, w) => (
          <View key={w} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {week.map((d, i) => {
              if (!d) return <View key={i} style={{ width: cell, height: cell }} />;
              const disabled = !!minDate && d < minDate;
              const selected = d === value;
              const isToday = d === today;
              return (
                <Pressable
                  key={d}
                  accessibilityRole="button"
                  accessibilityLabel={d}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => onSelect(d)}
                  style={({ pressed }) => ({
                    width: cell,
                    height: cell,
                    borderRadius: radius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected
                      ? colors.buttonPrimaryBg
                      : pressed
                        ? colors.surfaceMuted
                        : 'transparent',
                    borderWidth: isToday && !selected ? 1 : 0,
                    borderColor: colors.accent,
                  })}
                >
                  <AppText
                    style={{
                      fontFamily: fonts.mono,
                      fontWeight: selected || isToday ? '600' : '400',
                      color: selected
                        ? colors.buttonPrimaryText
                        : disabled
                          ? colors.border
                          : colors.text,
                    }}
                  >
                    {Number(d.slice(8, 10))}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </>
  );
}
