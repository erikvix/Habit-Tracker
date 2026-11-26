import { AppText } from '@/ui/components/AppText';
import { Card } from '@/ui/components/Card';
import { LevelLegend } from '@/ui/components/LevelLegend';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { useDialog } from '@/ui/dialog/DialogProvider';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space, type ThemePreference } from '@/ui/theme/tokens';

import { useUpdateSetting } from '../shared/queries';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
];

/** Aplica na hora (UI) e grava no banco; se a gravação falhar, volta ao anterior. */
export function AppearanceCard() {
  const { preference, setPreference } = useTheme();
  const update = useUpdateSetting();
  const showError = useDialog().showError('Não foi possível salvar');
  const change = (theme: ThemePreference) => {
    const previous = preference;
    setPreference(theme);
    update.mutate(
      { key: 'theme', value: theme },
      {
        onError: (e) => {
          setPreference(previous);
          showError(e);
        },
      },
    );
  };
  return (
    <Card style={{ gap: space.md }}>
      <AppText variant="heading">Aparência</AppText>
      <SegmentedControl
        accessibilityLabel="Tema"
        options={THEME_OPTIONS}
        value={preference}
        onChange={change}
      />
      <LevelLegend />
    </Card>
  );
}
