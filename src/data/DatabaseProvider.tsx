import { randomUUID } from 'expo-crypto';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/ui/components/AppText';
import { Blankslate } from '@/ui/components/Blankslate';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { space } from '@/ui/theme/tokens';

import { systemClock } from './context';
import { openExpoDriver } from './expoDriver';
import { migrate } from './migrations';
import { createRepositories, type Repositories } from './repositories';

interface DatabaseState {
  repos: Repositories;
  schemaVersion: number;
}

const DatabaseContext = createContext<DatabaseState | null>(null);

type Status =
  { kind: 'loading' } | { kind: 'ready'; state: DatabaseState } | { kind: 'error'; error: Error };

// A splash fica até o banco abrir e o tema salvo ser aplicado (sem piscar o tema errado).
void SplashScreen.preventAutoHideAsync().catch(() => {});

/** Abre o SQLite, aplica as migrations e o tema salvo antes de renderizar as telas. */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { colors, setPreference } = useTheme();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await openExpoDriver();
        const schemaVersion = await migrate(db);
        const repos = createRepositories({ db, clock: systemClock, newId: randomUUID });
        const { theme } = await repos.settings.getAll();
        if (!cancelled) {
          setPreference(theme);
          setStatus({ kind: 'ready', state: { repos, schemaVersion } });
        }
      } catch (e) {
        if (!cancelled) setStatus({ kind: 'error', error: e as Error });
      } finally {
        void SplashScreen.hideAsync().catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setPreference]);

  if (status.kind === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  }
  if (status.kind === 'error') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.canvas,
          justifyContent: 'center',
          padding: space.lg,
        }}
      >
        <Blankslate
          icon="alert"
          title="Não foi possível abrir o banco de dados"
          description="Os dados não foram alterados. Feche e abra o app novamente."
        >
          <AppText variant="mono" style={{ color: colors.danger }}>
            {status.error.message}
          </AppText>
        </Blankslate>
      </View>
    );
  }
  return <DatabaseContext.Provider value={status.state}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): DatabaseState {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase precisa estar dentro de <DatabaseProvider>');
  return ctx;
}

export const useRepositories = () => useDatabase().repos;
