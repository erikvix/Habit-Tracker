import Octicons from '@expo/vector-icons/Octicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { fonts, radius, space } from '../theme/tokens';
import { AppText } from './AppText';

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon?: ComponentProps<typeof Octicons>['name'];
  iconColor?: string;
}

/** Cartão de número: rótulo pequeno, valor grande em monoespaçado. */
export function StatCard({ label, value, hint, icon, iconColor }: Props) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}
      style={{
        flex: 1,
        minWidth: 140,
        gap: space.xs,
        padding: space.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.sm,
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        {icon ? <Octicons name={icon} size={14} color={iconColor ?? colors.textMuted} /> : null}
        <AppText variant="caption">{label}</AppText>
      </View>
      <AppText style={{ fontFamily: fonts.mono, fontSize: 22, fontWeight: '600' }}>{value}</AppText>
      {hint ? <AppText variant="caption">{hint}</AppText> : null}
    </View>
  );
}
