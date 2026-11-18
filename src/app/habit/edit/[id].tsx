import { useLocalSearchParams } from 'expo-router';

import { HabitEditScreen } from '@/features/habit-form/HabitEditScreen';

export default function EditHabitRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <HabitEditScreen id={id} />;
}
