import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';
import { FAB_SIZE } from './Fab';

/**
 * Tela rolável padrão. Com `fab`, o botão flutua sobre o conteúdo e a lista
 * ganha espaço no fim para o último item não ficar escondido atrás dele.
 */
export function Screen({ children, fab }: { children: ReactNode; fab?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: space.lg,
          gap: space.lg,
          paddingBottom: fab ? FAB_SIZE + space.lg * 2 : space.lg,
        }}
      >
        {children}
      </ScrollView>
      {fab}
    </View>
  );
}
