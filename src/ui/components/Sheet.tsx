import { useContext, type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { radius, space } from '../theme/tokens';
import { AppText } from './AppText';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Painel que sobe de baixo, com as cores do tema.
 * Substitui os diálogos nativos (que seguem o tema do Android, não o do app).
 * Fecha tocando fora ou no "voltar" do Android.
 */
export function Sheet({ visible, onClose, title, children }: Props) {
  const { colors } = useTheme();
  // Sem provider (testes) cai para 0, em vez de lançar erro como useSafeAreaInsets.
  const insets = useContext(SafeAreaInsetsContext) ?? { bottom: 0 };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(1,4,9,0.6)',
          }}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: colors.border,
            padding: space.lg,
            paddingBottom: space.lg + insets.bottom,
            gap: space.lg,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
            }}
          />
          {title ? (
            <AppText variant="heading" accessibilityRole="header">
              {title}
            </AppText>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}
