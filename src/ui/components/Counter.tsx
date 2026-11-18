import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';
import { AppText } from './AppText';

/** Pílula de contagem do GitHub (Primer "Counter"): fundo neutro, número pequeno. */
export function Counter({
  count,
  tone,
  suffix,
}: {
  count: number;
  tone?: 'danger';
  /** Ex.: '%' — muda também o rótulo de acessibilidade. */
  suffix?: string;
}) {
  const { colors, scheme } = useTheme();
  const neutral = scheme === 'dark' ? 'rgba(110,118,129,0.4)' : 'rgba(175,184,193,0.2)';
  const danger = scheme === 'dark' ? 'rgba(248,81,73,0.2)' : 'rgba(209,36,47,0.12)';
  return (
    <View
      accessibilityLabel={
        suffix ? `${count}${suffix}` : `${count} ${count === 1 ? 'item' : 'itens'}`
      }
      style={{
        minWidth: 20,
        height: 20,
        paddingHorizontal: 6,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tone === 'danger' ? danger : neutral,
      }}
    >
      <AppText
        style={{
          fontSize: 12,
          fontFamily: fonts.mono,
          fontWeight: '600',
          color: tone === 'danger' ? colors.danger : colors.text,
          includeFontPadding: false,
        }}
      >
        {count}
        {suffix}
      </AppText>
    </View>
  );
}

/** Título de seção com contador ao lado: "Hoje (2)". */
export function SectionTitle({
  title,
  count,
  tone,
}: {
  title: string;
  count: number;
  tone?: 'danger';
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppText
        accessibilityRole="header"
        style={{ fontWeight: '600', color: tone === 'danger' ? colors.danger : colors.text }}
      >
        {title}
      </AppText>
      <Counter count={count} tone={tone} />
    </View>
  );
}
