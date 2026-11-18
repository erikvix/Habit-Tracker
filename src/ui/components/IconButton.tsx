import Octicons from '@expo/vector-icons/Octicons';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { AppText } from './AppText';

interface Props {
  icon?: ComponentProps<typeof Octicons>['name'];
  /** Texto curto no lugar do ícone (ex.: "+5"). */
  text?: string;
  accessibilityLabel: string;
  onPress?: () => void;
  kind?: 'default' | 'primary' | 'invisible';
  size?: number;
  disabled?: boolean;
}

/** Botão quadrado de ícone (ações rápidas do card e do header). */
export function IconButton({
  icon,
  text,
  accessibilityLabel,
  onPress,
  kind = 'default',
  size = 36,
  disabled,
}: Props) {
  const { colors } = useTheme();
  const primary = kind === 'primary';
  const fg = primary ? colors.buttonPrimaryText : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={6}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minWidth: size,
        height: size,
        paddingHorizontal: text ? 8 : 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.sm,
        borderWidth: kind === 'invisible' ? 0 : 1,
        borderColor: primary ? colors.buttonPrimaryBorder : colors.border,
        backgroundColor: primary
          ? colors.buttonPrimaryBg
          : kind === 'invisible'
            ? 'transparent'
            : colors.buttonBg,
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
      })}
    >
      {icon ? (
        <Octicons name={icon} size={16} color={fg} />
      ) : (
        <AppText variant="mono" style={{ color: fg, fontWeight: '600' }}>
          {text}
        </AppText>
      )}
    </Pressable>
  );
}
