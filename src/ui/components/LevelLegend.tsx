import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';
import { AppText } from './AppText';

/** Legenda "Menos ▢▢▢▢▢ Mais" do contribution graph. */
export function LevelLegend({ cell = 12 }: { cell?: number }) {
  const { colors, scheme } = useTheme();
  const outline = scheme === 'dark' ? 'rgba(240,246,252,0.06)' : 'rgba(31,35,40,0.06)';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <AppText variant="caption">Menos</AppText>
      {colors.levels.map((c, i) => (
        <View
          key={i}
          style={{
            width: cell,
            height: cell,
            borderRadius: 2,
            backgroundColor: c,
            borderWidth: 1,
            borderColor: outline,
          }}
        />
      ))}
      <AppText variant="caption">Mais</AppText>
    </View>
  );
}
