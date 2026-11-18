import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { IconButton } from '@/ui/components/IconButton';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { fontSize, radius, space } from '@/ui/theme/tokens';

/** Campo "Nova tarefa…": Enter (ou +) cria a tarefa sem prazo e limpa o campo. */
export function QuickAddTask({ onAdd, busy }: { onAdd: (title: string) => void; busy?: boolean }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const submit = () => {
    const t = title.trim();
    if (!t || busy) return;
    onAdd(t);
    setTitle('');
  };

  return (
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
      <TextInput
        accessibilityLabel="Nova tarefa"
        placeholder="Nova tarefa…"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={submit}
        returnKeyType="done"
        submitBehavior="submit"
        maxLength={200}
        style={{
          flex: 1,
          height: 40,
          paddingVertical: 0,
          paddingHorizontal: space.md,
          includeFontPadding: false,
          color: colors.text,
          fontSize: fontSize.sm,
          backgroundColor: colors.canvas,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.sm,
        }}
      />
      <IconButton
        icon="plus"
        kind="primary"
        size={40}
        accessibilityLabel="Adicionar tarefa"
        disabled={!title.trim() || busy}
        onPress={submit}
      />
    </View>
  );
}
