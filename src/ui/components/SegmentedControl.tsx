import { Pressable, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { radius, space } from '../theme/tokens';
import { AppText } from './AppText';

interface Props<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

/** Controle segmentado no estilo Primer. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.sm,
        padding: 2,
      }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: space.sm,
              borderRadius: radius.sm - 1,
              backgroundColor: selected ? colors.canvas : 'transparent',
              borderWidth: 1,
              borderColor: selected ? colors.border : 'transparent',
            }}
          >
            <AppText style={{ fontWeight: selected ? '600' : '400' }}>{o.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
