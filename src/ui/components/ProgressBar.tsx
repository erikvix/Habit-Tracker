import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

/** Barra fina de progresso; cor = nível do dia. */
export function ProgressBar({ ratio, color }: { ratio: number; color: string }) {
  const { colors } = useTheme();
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={{
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.surfaceMuted,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}
