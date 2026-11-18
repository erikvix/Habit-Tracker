import Octicons from '@expo/vector-icons/Octicons';
import { Pressable, View } from 'react-native';

import type { TaskRecord } from '@/data/repositories/taskRepo';
import type { LocalDate } from '@/domain/types';
import { AppText } from '@/ui/components/AppText';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space } from '@/ui/theme/tokens';

import { completedLabel, dueLabel } from './model';

const ACTION_WIDTH = 56;

interface Props {
  task: TaskRecord;
  today: LocalDate;
  onToggle: () => void;
  onOpen: () => void;
  first?: boolean;
  disabled?: boolean;
}

/**
 * Linha de tarefa no estilo de issue do GitHub.
 * Esquerda: ícone de status (só indicativo). Meio: título/prazo (abre a edição).
 * Direita: coluna concluir/reabrir encostada no fim do card, ao alcance do polegar.
 */
export function TaskRow({ task, today, onToggle, onOpen, first, disabled }: Props) {
  const { colors } = useTheme();
  const done = !!task.completedAt;
  const due = done ? null : dueLabel(task, today);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.canvas,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar ${task.title}`}
        onPress={onOpen}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: space.md,
          paddingVertical: space.md,
          paddingLeft: space.lg,
          paddingRight: space.md,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ paddingTop: 1 }} importantForAccessibility="no-hide-descendants">
          <Octicons
            name={done ? 'issue-closed' : 'issue-opened'}
            size={16}
            color={done ? colors.done : colors.success}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText
            numberOfLines={2}
            style={{
              fontWeight: '600',
              color: done ? colors.textMuted : colors.text,
              textDecorationLine: done ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </AppText>
          {done ? (
            <AppText variant="caption">{completedLabel(task.completedLocalDate, today)}</AppText>
          ) : due ? (
            <AppText
              variant="caption"
              style={due.tone === 'danger' ? { color: colors.danger } : undefined}
            >
              {due.text}
            </AppText>
          ) : null}
        </View>
      </Pressable>

      {/* Coluna de ação encostada no fim do card: altura toda da linha, alvo grande para o polegar. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={done ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onToggle}
        style={({ pressed }) => ({
          width: ACTION_WIDTH,
          alignSelf: 'stretch',
          alignItems: 'center',
          justifyContent: 'center',
          borderLeftWidth: 1,
          borderLeftColor: colors.border,
          backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
          opacity: disabled ? 0.5 : 1,
        })}
      >
        <Octicons
          name={done ? 'undo' : 'check'}
          size={18}
          color={done ? colors.textMuted : colors.text}
        />
      </Pressable>
    </View>
  );
}

/** Caixa com borda que agrupa linhas (como as listas do GitHub). */
export function TaskList({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}
