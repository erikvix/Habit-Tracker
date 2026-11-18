import Octicons from '@expo/vector-icons/Octicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { fontSize, radius, space } from '../theme/tokens';
import { AppText } from './AppText';

/** danger = texto vermelho (ação secundária); dangerSolid = fundo vermelho (confirmar exclusão). */
type Kind = 'default' | 'primary' | 'danger' | 'dangerSolid';

interface Props {
  title: string;
  onPress?: () => void;
  kind?: Kind;
  icon?: ComponentProps<typeof Octicons>['name'];
  disabled?: boolean;
}

/** Botão no estilo Primer (GitHub): borda 1px, raio 6, verde para ação primária. */
export function Button({ title, onPress, kind = 'default', icon, disabled }: Props) {
  const { colors } = useTheme();
  const primary = kind === 'primary';
  const solidDanger = kind === 'dangerSolid';
  const bg = primary ? colors.buttonPrimaryBg : solidDanger ? colors.danger : colors.buttonBg;
  const fg =
    primary || solidDanger
      ? colors.buttonPrimaryText
      : kind === 'danger'
        ? colors.danger
        : colors.text;
  const border = primary || solidDanger ? colors.buttonPrimaryBorder : colors.border;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      {icon ? <Octicons name={icon} size={16} color={fg} /> : null}
      <AppText style={{ color: fg, fontWeight: '600', fontSize: fontSize.sm }}>{title}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});
