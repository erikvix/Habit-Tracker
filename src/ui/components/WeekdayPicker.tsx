import { Pressable, View } from 'react-native';

import type { Weekday } from '@/domain/types';
import { WEEKDAY_LETTERS, WEEKDAY_NAMES } from '@/features/shared/model';

import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';
import { AppText } from './AppText';

interface Props {
  value: readonly Weekday[];
  onChange: (days: Weekday[]) => void;
}

const ALL: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

/** D S T Q Q S S — alterna dias da semana. */
export function WeekdayPicker({ value, onChange }: Props) {
  const { colors } = useTheme();
  const toggle = (d: Weekday) =>
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort());

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.xs }}>
      {ALL.map((d) => {
        const on = value.includes(d);
        return (
          <Pressable
            key={d}
            accessibilityRole="checkbox"
            accessibilityLabel={WEEKDAY_NAMES[d]}
            accessibilityState={{ checked: on }}
            onPress={() => toggle(d)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: on ? colors.buttonPrimaryBg : colors.border,
              backgroundColor: on ? colors.buttonPrimaryBg : colors.canvas,
            }}
          >
            <AppText
              style={{ fontWeight: '600', color: on ? colors.buttonPrimaryText : colors.textMuted }}
            >
              {WEEKDAY_LETTERS[d]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
