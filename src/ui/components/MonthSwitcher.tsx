import { View } from 'react-native';

import { addMonths } from '@/domain/localDate';
import type { MonthKey } from '@/domain/types';
import { monthLongLabel } from '@/features/shared/model';

import { space } from '../theme/tokens';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

interface Props {
  month: MonthKey;
  onChange: (month: MonthKey) => void;
  /** Não avança além deste mês (normalmente o atual). */
  max: MonthKey;
  /** Não volta antes deste mês (primeiro mês com dados). */
  min?: MonthKey;
}

/** ‹ Novembro 2026 › */
export function MonthSwitcher({ month, onChange, max, min }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <IconButton
        icon="chevron-left"
        size={32}
        accessibilityLabel="Mês anterior"
        disabled={!!min && month <= min}
        onPress={() => onChange(addMonths(month, -1))}
      />
      <AppText style={{ flex: 1, textAlign: 'center', fontWeight: '600' }}>
        {monthLongLabel(month)}
      </AppText>
      <IconButton
        icon="chevron-right"
        size={32}
        accessibilityLabel="Próximo mês"
        disabled={month >= max}
        onPress={() => onChange(addMonths(month, 1))}
      />
    </View>
  );
}
