import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';

import { DatePickerSheet } from '@/ui/components/DatePickerSheet';
import { DialogProvider, useDialog, type ConfirmOptions } from '@/ui/dialog/DialogProvider';
import { AppThemeProvider } from '@/ui/theme/ThemeProvider';

/** Abre um confirm ao montar e repassa o resultado. */
function Asker({ options, onResult }: { options: ConfirmOptions; onResult: (v: boolean) => void }) {
  const dialog = useDialog();
  useEffect(() => {
    void dialog.confirm(options).then(onResult);
  }, [dialog, options, onResult]);
  return null;
}

const opts: ConfirmOptions = {
  title: 'Excluir hábito?',
  message: 'Isso não pode ser desfeito.',
  confirmLabel: 'Excluir',
  destructive: true,
};

const renderAsker = (onResult: (v: boolean) => void) =>
  render(
    <AppThemeProvider>
      <DialogProvider>
        <Asker options={opts} onResult={onResult} />
      </DialogProvider>
    </AppThemeProvider>,
  );

describe('DialogProvider.confirm', () => {
  it('mostra título e mensagem; confirmar resolve true', async () => {
    const onResult = jest.fn();
    await renderAsker(onResult);
    expect(screen.getByText('Excluir hábito?')).toBeTruthy();
    expect(screen.getByText('Isso não pode ser desfeito.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Excluir'));
    await act(async () => {});
    expect(onResult).toHaveBeenCalledWith(true);
  });

  it('cancelar resolve false (a ação não acontece)', async () => {
    const onResult = jest.fn();
    await renderAsker(onResult);
    await fireEvent.press(screen.getByText('Cancelar'));
    await act(async () => {});
    expect(onResult).toHaveBeenCalledWith(false);
  });
});

describe('DatePickerSheet', () => {
  it('dias antes do mínimo ficam desabilitados', async () => {
    const onSelect = jest.fn();
    await render(
      <AppThemeProvider>
        <DatePickerSheet
          visible
          value={null}
          today="2026-11-18"
          minDate="2026-11-18"
          onSelect={onSelect}
          onClose={() => {}}
        />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Novembro 2026')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('2026-11-17'));
    expect(onSelect).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('2026-11-20'));
    expect(onSelect).toHaveBeenCalledWith('2026-11-20');
    expect(screen.getByLabelText('Mês anterior').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });
});
