import { Text, type TextProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { fonts, fontSize } from '../theme/tokens';

type Variant = 'title' | 'heading' | 'body' | 'muted' | 'caption' | 'mono';

const variantStyle = {
  title: { fontSize: fontSize.xl, fontWeight: '600' },
  heading: { fontSize: fontSize.md, fontWeight: '600' },
  body: { fontSize: fontSize.sm },
  muted: { fontSize: fontSize.sm },
  caption: { fontSize: fontSize.xs },
  mono: { fontSize: fontSize.sm, fontFamily: fonts.mono },
} as const;

export function AppText({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const { colors } = useTheme();
  const color = variant === 'muted' || variant === 'caption' ? colors.textMuted : colors.text;
  return (
    <Text style={[{ color, fontFamily: fonts.sans }, variantStyle[variant], style]} {...rest} />
  );
}
