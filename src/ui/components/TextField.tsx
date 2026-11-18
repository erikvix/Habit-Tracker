import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { fontSize, radius, space } from '../theme/tokens';
import { AppText } from './AppText';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  hint?: string;
}

/** Campo de texto no estilo Primer: borda 1px, foco em azul, erro em vermelho. */
export function TextField({ label, error, hint, multiline, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const border = error ? colors.danger : focused ? colors.accent : colors.border;

  return (
    <View style={{ gap: space.xs }}>
      <AppText style={{ fontWeight: '600' }}>{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        multiline={multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          color: colors.text,
          backgroundColor: colors.canvas,
          borderColor: border,
          borderWidth: 1,
          borderRadius: radius.sm,
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
          fontSize: fontSize.sm,
          minHeight: multiline ? 72 : 40,
          includeFontPadding: false, // Android: centraliza o texto como no iOS
          textAlignVertical: multiline ? 'top' : 'center',
        }}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
    </View>
  );
}
