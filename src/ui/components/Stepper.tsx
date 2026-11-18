import { TextInput, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { fonts, fontSize, radius, space } from '../theme/tokens';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label: string;
}

const CONTROL_HEIGHT = 40;

/** [−] valor unidade [+], com o valor editável pelo teclado numérico. */
export function Stepper({ value, onChange, min = 1, max = 1000, step = 1, unit, label }: Props) {
  const { colors } = useTheme();
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <IconButton
        icon="dash"
        size={CONTROL_HEIGHT}
        accessibilityLabel={`Diminuir ${label}`}
        disabled={value <= min}
        onPress={() => onChange(clamp(value - step))}
      />
      <TextInput
        accessibilityLabel={label}
        keyboardType="number-pad"
        // Campo vazio quando 0 não é um valor válido (ex.: meta); mostra "0" quando é (ex.: hora).
        value={Number.isFinite(value) && (value > 0 || min === 0) ? String(value) : ''}
        onChangeText={(t) => {
          const n = Number.parseInt(t.replace(/\D/g, ''), 10);
          onChange(Number.isNaN(n) ? 0 : Math.min(n, max));
        }}
        selectionColor={colors.accent}
        style={{
          width: 72,
          height: CONTROL_HEIGHT,
          // Android: o TextInput tem padding e "font padding" padrão que cortam o texto
          // numa caixa de altura fixa.
          paddingVertical: 0,
          paddingHorizontal: 0,
          includeFontPadding: false,
          textAlignVertical: 'center',
          textAlign: 'center',
          color: colors.text,
          fontFamily: fonts.mono,
          fontSize: fontSize.md,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.sm,
          backgroundColor: colors.canvas,
        }}
      />
      <IconButton
        icon="plus"
        size={CONTROL_HEIGHT}
        accessibilityLabel={`Aumentar ${label}`}
        disabled={value >= max}
        onPress={() => onChange(clamp(value + step))}
      />
      {unit ? <AppText variant="muted">{unit}</AppText> : null}
    </View>
  );
}
