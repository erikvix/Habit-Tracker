import Octicons from '@expo/vector-icons/Octicons';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';

export const FAB_SIZE = 56;

interface Props {
  icon: ComponentProps<typeof Octicons>['name'];
  accessibilityLabel: string;
  onPress: () => void;
}

/** Botão flutuante verde no canto inferior direito (posicionado pelo <Screen fab>). */
export function Fab({ icon, accessibilityLabel, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        right: space.lg,
        bottom: space.lg,
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.buttonPrimaryBg,
        borderWidth: 1,
        borderColor: colors.buttonPrimaryBorder,
        opacity: pressed ? 0.85 : 1,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      })}
    >
      <Octicons name={icon} size={24} color={colors.buttonPrimaryText} />
    </Pressable>
  );
}
