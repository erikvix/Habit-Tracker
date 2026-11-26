import type { RepoContext } from '../context';
import { getSchemaVersion } from '../migrations';

/** Tabelas no backup, em ordem de dependência (pais antes dos filhos). Cronômetro ativo fica fora. */
export const BACKUP_TABLES = [
  'habit',
  'habit_schedule',
  'commit_entry',
  'task',
  'reminder',
  'setting',
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

export interface Backup {
  app: 'todo-tracker';
  /** Versão do formato do arquivo (muda só se a estrutura do JSON mudar). */
  format: 1;
  schemaVersion: number;
  exportedAt: string;
  /** Linhas cruas de cada tabela: nada se perde na exportação. */
  tables: Record<BackupTable, Record<string, unknown>[]>;
}

export function createBackupRepo({ db, clock }: RepoContext) {
  return {
    /** Foto consistente do banco (lida numa transação). */
    async exportAll(): Promise<Backup> {
      const schemaVersion = await getSchemaVersion(db);
      const tables = await db.transaction(async (tx) => {
        const out = {} as Backup['tables'];
        for (const t of BACKUP_TABLES) {
          out[t] = await tx.all<Record<string, unknown>>(`SELECT * FROM ${t} ORDER BY rowid`);
        }
        return out;
      });
      return {
        app: 'todo-tracker',
        format: 1,
        schemaVersion,
        exportedAt: clock.now().toISOString(),
        tables,
      };
    },
  };
}

export type BackupRepo = ReturnType<typeof createBackupRepo>;

/** Contagens para mostrar ao usuário ("4 hábitos · 812 commits · 12 tarefas"). */
export function backupSummary(b: Backup) {
  return {
    habits: b.tables.habit.length,
    commits: b.tables.commit_entry.length,
    tasks: b.tables.task.length,
  };
}

/** Nome do arquivo: todo-tracker-backup-2026-11-25.json (data local). */
export function backupFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `todo-tracker-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}
