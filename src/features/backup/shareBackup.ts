import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Repositories } from '@/data/repositories';
import { backupFileName, backupSummary } from '@/data/repositories/backupRepo';

/** Gera o JSON no cache e abre o compartilhamento do Android (Drive, Arquivos, WhatsApp…). */
export async function shareBackup(repos: Repositories) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartilhamento indisponível neste aparelho');
  }
  const backup = await repos.backup.exportAll();
  const file = new File(Paths.cache, backupFileName(new Date()));
  file.create({ overwrite: true });
  await file.write(JSON.stringify(backup, null, 2));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Salvar backup',
  });
  return backupSummary(backup);
}
