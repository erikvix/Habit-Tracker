import { router } from 'expo-router';
import { View } from 'react-native';

import type { LocalDate } from '@/domain/types';
import { SectionTitle } from '@/ui/components/Counter';
import { space } from '@/ui/theme/tokens';

import { groupOpenTasks } from './model';
import { useTasks } from './queries';
import { TaskList, TaskRow } from './TaskRow';
import { useTaskToggle } from './useTaskToggle';

/** Seção da tela Hoje: tarefas atrasadas e de hoje. Some quando não há nenhuma. */
export function TodayTasks({ today }: { today: LocalDate }) {
  const tasks = useTasks('open', today);
  const { toggle, busy } = useTaskToggle();
  if (!tasks.data) return null;

  const g = groupOpenTasks(tasks.data, today);
  const items = [...g.overdue, ...g.today];
  if (items.length === 0) return null;

  return (
    <View style={{ gap: space.sm }}>
      <SectionTitle title="Tarefas" count={items.length} />
      <TaskList>
        {items.map((t, i) => (
          <TaskRow
            key={t.id}
            task={t}
            today={today}
            first={i === 0}
            disabled={busy}
            onToggle={() => toggle(t)}
            onOpen={() => router.push({ pathname: '/task/[id]', params: { id: t.id } })}
          />
        ))}
      </TaskList>
    </View>
  );
}
