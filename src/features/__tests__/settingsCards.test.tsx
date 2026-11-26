import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text } from 'react-native';

import { DialogProvider } from '@/ui/dialog/DialogProvider';
import { AppThemeProvider, useTheme } from '@/ui/theme/ThemeProvider';

import { BackupCard } from '../backup/BackupCard';
import { AppearanceCard } from '../settings/PreferenceCards';

const mockStored = { theme: 'dark' };
const mockRepos = {
  settings: {
    getAll: jest.fn(async () => ({ ...mockStored })),
    set: jest.fn(async (key: keyof typeof mockStored, value: never) => {
      (mockStored as Record<string, unknown>)[key] = value;
    }),
  },
};

jest.mock('@/data/DatabaseProvider', () => ({ useRepositories: () => mockRepos }));

const mockShare = jest.fn();
jest.mock('../backup/shareBackup', () => ({ shareBackup: () => mockShare() }));

function SchemeProbe() {
  return <Text>{`esquema:${useTheme().scheme}`}</Text>;
}

function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({
    // gcTime infinito: sem timers pendentes segurando o Jest depois dos testes.
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(
    <AppThemeProvider>
      <QueryClientProvider client={client}>
        <DialogProvider>{ui}</DialogProvider>
      </QueryClientProvider>
    </AppThemeProvider>,
  );
}

beforeEach(() => {
  Object.assign(mockStored, { theme: 'dark' });
  jest.clearAllMocks();
});

describe('AppearanceCard', () => {
  it('troca o tema na hora e grava no banco', async () => {
    await renderWithProviders(
      <>
        <AppearanceCard />
        <SchemeProbe />
      </>,
    );
    await fireEvent.press(screen.getByText('Claro'));
    expect(screen.getByText('esquema:light')).toBeTruthy();
    await waitFor(() => expect(mockRepos.settings.set).toHaveBeenCalledWith('theme', 'light'));
  });

  it('falha ao gravar: volta ao tema anterior e mostra o erro', async () => {
    mockRepos.settings.set.mockRejectedValueOnce(new Error('disco cheio'));
    await renderWithProviders(
      <>
        <AppearanceCard />
        <SchemeProbe />
      </>,
    );
    await fireEvent.press(screen.getByText('Claro'));
    expect(await screen.findByText('disco cheio')).toBeTruthy();
    expect(screen.getByText('esquema:dark')).toBeTruthy();
  });
});

describe('BackupCard', () => {
  it('exporta e mostra o resumo', async () => {
    mockShare.mockResolvedValueOnce({ habits: 2, commits: 30, tasks: 1 });
    await renderWithProviders(<BackupCard />);
    await fireEvent.press(screen.getByText('Exportar backup'));
    expect(await screen.findByText(/2 hábito\(s\) · 30 commit\(s\) · 1 tarefa\(s\)/)).toBeTruthy();
  });

  it('erro na exportação vira diálogo', async () => {
    mockShare.mockRejectedValueOnce(new Error('Compartilhamento indisponível neste aparelho'));
    await renderWithProviders(<BackupCard />);
    await fireEvent.press(screen.getByText('Exportar backup'));
    expect(await screen.findByText('Falha ao exportar')).toBeTruthy();
  });
});
