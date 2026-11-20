import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppThemeProvider } from '@/ui/theme/ThemeProvider';

import { HabitForm } from '../habit-form/HabitForm';
import { emptyHabitForm } from '../habit-form/model';

function renderForm(requestPermission?: () => Promise<boolean>, reminders: number[] = []) {
  const onSubmit = jest.fn();
  const utils = render(
    <AppThemeProvider>
      <HabitForm
        initial={{ ...emptyHabitForm, name: 'Água', reminders }}
        submitLabel="Salvar"
        onSubmit={onSubmit}
        requestPermission={requestPermission}
      />
    </AppThemeProvider>,
  );
  return { onSubmit, utils };
}

describe('HabitForm — lembretes', () => {
  it('adiciona pelo relógio (09:00 padrão), pede permissão e envia', async () => {
    const ask = jest.fn().mockResolvedValue(true);
    const { onSubmit, utils } = renderForm(ask);
    await utils;
    await fireEvent.press(screen.getByText('Adicionar horário'));
    await fireEvent.press(screen.getByText('Definir'));
    expect(screen.getByLabelText('Remover lembrete das 09:00')).toBeTruthy();
    expect(ask).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByText('Salvar'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ reminders: [540] }));
  });

  it('remove ao tocar no chip', async () => {
    const { onSubmit, utils } = renderForm(undefined, [450, 1200]);
    await utils;
    await fireEvent.press(screen.getByLabelText('Remover lembrete das 07:30'));
    await fireEvent.press(screen.getByText('Salvar'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ reminders: [1200] }));
  });

  it('permissão negada mostra o aviso', async () => {
    const { utils } = renderForm(() => Promise.resolve(false));
    await utils;
    await fireEvent.press(screen.getByText('Adicionar horário'));
    await fireEvent.press(screen.getByText('Definir'));
    expect(await screen.findByText(/Notificações bloqueadas/)).toBeTruthy();
  });

  it('limite de 5 horários esconde o botão', async () => {
    const { utils } = renderForm(undefined, [60, 120, 180, 240, 300]);
    await utils;
    expect(screen.queryByText('Adicionar horário')).toBeNull();
  });
});
