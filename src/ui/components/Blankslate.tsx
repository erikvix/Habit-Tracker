import Octicons from '@expo/vector-icons/Octicons';
import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { radius, space } from '../theme/tokens';
import { AppText } from './AppText';

interface Props {
  icon?: ComponentProps<typeof Octicons>['name'];
  visual?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}

/** Estado vazio no padrão "Blankslate" do GitHub. */
export function Blankslate({ icon, visual, title, description, children }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        gap: space.sm,
        padding: space.xxl,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.sm,
      }}
    >
      {visual ?? (icon ? <Octicons name={icon} size={24} color={colors.textMuted} /> : null)}
      <AppText variant="heading" style={{ textAlign: 'center', marginTop: space.sm }}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="muted" style={{ textAlign: 'center' }}>
          {description}
        </AppText>
      ) : null}
      {children ? <View style={{ marginTop: space.md }}>{children}</View> : null}
    </View>
  );
}
