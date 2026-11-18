import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import type { TaskRecord } from '@/data/repositories/taskRepo';
import { Blankslate } from '@/ui/components/Blankslate';
import { SectionTitle } from '@/ui/components/Counter';
import { Screen } from '@/ui/components/Screen';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { space } from '@/ui/theme/tokens';

import { useToday } from '../shared/queries';
import { groupOpenTasks } from './model';
import { QuickAddTask } from './QuickAddTask';
import { useTasks } from './queries';
import { TaskList, TaskRow } from './TaskRow';
import { useTaskToggle } from './useTaskToggle';

type View_ = 'open' | 'done';

export function TasksScreen() {
  const today = useToday();
  const [tab, setTab] = useState<View_>('open');
  const tasks = useTasks(tab, today);
  const { toggle, busy, actions } = useTaskToggle();

  const open = (t: TaskRecord) => router.push({ pathname: '/task/[id]', params: { id: t.id } });

  const section = (title: string, items: TaskRecord[], tone?: 'danger') =>
    items.length === 0 ? null : (
      <View key={title} style={{ gap: space.sm }}>
        <SectionTitle title={title} count={items.length} tone={tone} />
        <TaskList>
          {items.map((t, i) => (
            <TaskRow
              key={t.id}
              task={t}
              today={today}
              first={i === 0}
              disabled={busy}
              onToggle={() => toggle(t)}
              onOpen={() => open(t)}
            />
          ))}
        </TaskList>
      </View>
    );

  let body: React.ReactNode = null;
  if (tasks.isError) {
    body = <Blankslate icon="alert" title="Erro ao carregar" description={tasks.error.message} />;
  } else if (tasks.data && tasks.data.length === 0) {
    body =
      tab === 'open' ? (
        <Blankslate
          icon="tasklist"
          title="Nenhuma tarefa aberta"
          description="Tarefas concluídas também contam no gráfico geral."
        />
      ) : (
        <Blankslate icon="issue-closed" title="Nada concluído ainda" />
      );
  } else if (tasks.data && tab === 'open') {
    const g = groupOpenTasks(tasks.data, today);
    body = [
      section('Atrasadas', g.overdue, 'danger'),
      section('Hoje', g.today),
      section('Próximas', g.upcoming),
      section('Sem prazo', g.noDate),
    ];
  } else if (tasks.data) {
    body = section('Concluídas', tasks.data);
  }

  return (
    <Screen>
      <SegmentedControl
        accessibilityLabel="Filtro de tarefas"
        options={[
          { value: 'open', label: 'Abertas' },
          { value: 'done', label: 'Concluídas' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'open' ? (
        <QuickAddTask
          busy={actions.create.isPending}
          onAdd={(title) =>
            actions.create.mutate(
              { title },
              { onError: (e) => Alert.alert('Não foi possível criar', e.message) },
            )
          }
        />
      ) : null}
      {body}
    </Screen>
  );
}
