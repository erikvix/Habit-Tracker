import { useLocalSearchParams } from 'expo-router';

import { TaskEditorScreen } from '@/features/tasks/TaskEditorScreen';

export default function EditTaskRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TaskEditorScreen id={id} />;
}
