import { useLocalSearchParams } from 'expo-router';

import { DayEditorScreen } from '@/features/habit-day/DayEditorScreen';

export default function DayEditorRoute() {
  const { id, date } = useLocalSearchParams<{ id: string; date: string }>();
  return <DayEditorScreen habitId={id} date={date} />;
}
