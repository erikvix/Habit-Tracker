import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';

export function Screen({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg }}
    >
      {children}
    </ScrollView>
  );
}
