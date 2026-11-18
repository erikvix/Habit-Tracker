import { View } from 'react-native';

import type { Level } from '@/domain/types';

import { useTheme } from '../theme/ThemeProvider';

/** Mini faixa de dias (últimos 7) com as cores de nível. */
export function DayStrip({
  days,
  cell = 10,
}: {
  days: readonly { date: string; level: Level; active: boolean }[];
  cell?: number;
}) {
  const { colors, scheme } = useTheme();
  const outline = scheme === 'dark' ? 'rgba(240,246,252,0.08)' : 'rgba(31,35,40,0.08)';
  return (
    <View
      style={{ flexDirection: 'row', gap: 3 }}
      accessibilityLabel={`Últimos ${days.length} dias`}
    >
      {days.map((d) => {
        const rest = !d.active && d.level === 0;
        return (
          <View
            key={d.date}
            style={{
              width: cell,
              height: cell,
              borderRadius: 2,
              backgroundColor: rest ? 'transparent' : colors.levels[d.level],
              borderWidth: 1,
              borderColor: rest ? colors.border : outline,
            }}
          />
        );
      })}
    </View>
  );
}
