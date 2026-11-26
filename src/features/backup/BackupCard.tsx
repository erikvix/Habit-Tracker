import { useMutation } from '@tanstack/react-query';

import { useRepositories } from '@/data/DatabaseProvider';
import { AppText } from '@/ui/components/AppText';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { useDialog } from '@/ui/dialog/DialogProvider';
import { space } from '@/ui/theme/tokens';

import { shareBackup } from './shareBackup';

/** Card de Ajustes: exporta todos os dados num JSON. */
export function BackupCard() {
  const repos = useRepositories();
  const dialog = useDialog();
  const exportM = useMutation({ mutationFn: () => shareBackup(repos) });
  const last = exportM.data;

  return (
    <Card style={{ gap: space.md }}>
      <AppText variant="heading">Backup</AppText>
      <AppText variant="caption">
        Exporta hábitos, commits, tarefas, lembretes e ajustes num arquivo JSON. Guarde fora do
        celular (Drive, e-mail) para não perder o histórico.
      </AppText>
      <Button
        icon="download"
        title={exportM.isPending ? 'Exportando…' : 'Exportar backup'}
        disabled={exportM.isPending}
        onPress={() =>
          exportM.mutate(undefined, { onError: dialog.showError('Falha ao exportar') })
        }
      />
      {last ? (
        <AppText variant="caption">
          Último: {last.habits} hábito(s) · {last.commits} commit(s) · {last.tasks} tarefa(s)
        </AppText>
      ) : null}
    </Card>
  );
}
