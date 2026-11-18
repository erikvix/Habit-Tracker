import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { history } from '@/domain/__tests__/helpers';
import { ContributionGraph } from '@/ui/components/ContributionGraph';
import { AppThemeProvider } from '@/ui/theme/ThemeProvider';

import { habitGraphData } from '../habit-detail/model';
import { HabitForm } from '../habit-form/HabitForm';
import { HabitCard } from '../today/HabitCard';
import { buildTodayList } from '../today/model';

const TODAY = '2026-11-18'; // quarta

const renderThemed = (ui: ReactElement) => render(<AppThemeProvider>{ui}</AppThemeProvider>);

describe('HabitForm', () => {
  it('bloqueia envio sem nome e mostra o erro', async () => {
    const onSubmit = jest.fn();
    await renderThemed(<HabitForm submitLabel="Criar hábito" onSubmit={onSubmit} />);
    await fireEvent.press(screen.getByText('Criar hábito'));
    expect(screen.getByText('Dê um nome ao hábito')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('meta diária só aparece para contagem/tempo; envia os valores', async () => {
    const onSubmit = jest.fn();
    await renderThemed(<HabitForm submitLabel="Criar hábito" onSubmit={onSubmit} />);
    expect(screen.queryByText('Meta diária')).toBeNull();

    await fireEvent.press(screen.getByText('Contagem'));
    expect(screen.getByText('Meta diária')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Aumentar meta diária'));

    await fireEvent.changeText(screen.getByLabelText('Nome'), 'Água');
    await fireEvent.press(screen.getByText('Criar hábito'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Água', goalType: 'count', target: 5, everyDay: true }),
    );
  });

  it('dias específicos sem nenhum dia marcado é recusado', async () => {
    const onSubmit = jest.fn();
    await renderThemed(<HabitForm submitLabel="Criar hábito" onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByLabelText('Nome'), 'Academia');
    await fireEvent.press(screen.getByText('Dias específicos'));
    for (const d of ['segunda', 'terça', 'quarta', 'quinta', 'sexta']) {
      await fireEvent.press(screen.getByLabelText(d)); // desmarca seg–sex (padrão)
    }
    await fireEvent.press(screen.getByText('Criar hábito'));
    expect(screen.getByText('Escolha pelo menos um dia')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('ContributionGraph', () => {
  it('desenha os dias até hoje e informa o dia tocado', async () => {
    const g = habitGraphData(history({ startDate: '2026-01-01' }), TODAY);
    const onPressDay = jest.fn();
    await renderThemed(
      <ContributionGraph weeks={g.weeks} monthLabels={g.monthLabels} onPressDay={onPressDay} />,
    );
    // 53 semanas × 7 − 3 dias futuros (qui, sex, sáb).
    expect(screen.getAllByTestId(/^cell-/)).toHaveLength(53 * 7 - 3);
    expect(screen.queryByTestId('cell-2026-11-19')).toBeNull();
    await fireEvent.press(screen.getByTestId('cell-2026-11-18'));
    expect(onPressDay).toHaveBeenCalledWith('2026-11-18');
  });
});

describe('HabitCard', () => {
  const card = async (goalType: 'binary' | 'count' | 'time', progress = 0) => {
    const target = goalType === 'count' ? 8 : goalType === 'time' ? 30 : 1;
    const h = history({
      name: 'Hábito',
      goalType,
      startDate: '2026-11-01',
      schedules: [['2026-11-01', target]],
      progress: progress ? { [TODAY]: progress } : {},
    });
    const item = buildTodayList([h], TODAY).active[0]!;
    const handlers = { onCommit: jest.fn(), onUndo: jest.fn(), onOpen: jest.fn() };
    await renderThemed(<HabitCard item={item} {...handlers} />);
    return handlers;
  };

  it('contagem: + commita, − desabilitado sem progresso', async () => {
    const h = await card('count');
    expect(screen.getByText('0/8')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Adicionar um a Hábito'));
    expect(h.onCommit).toHaveBeenCalledWith();
    await fireEvent.press(screen.getByLabelText('Remover um de Hábito'));
    expect(h.onUndo).not.toHaveBeenCalled();
  });

  it('tempo: +5 e +15 passam os minutos', async () => {
    const h = await card('time', 10);
    expect(screen.getByText('10/30 min')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Adicionar 5 minutos a Hábito'));
    await fireEvent.press(screen.getByLabelText('Adicionar 15 minutos a Hábito'));
    expect(h.onCommit.mock.calls).toEqual([[5], [15]]);
    await fireEvent.press(screen.getByLabelText('Desfazer último registro de Hábito'));
    expect(h.onUndo).toHaveBeenCalledTimes(1);
  });

  it('binário feito: o check desfaz; tocar no nome abre o detalhe', async () => {
    const h = await card('binary', 1);
    expect(screen.getByText('Feito')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Desfazer Hábito'));
    expect(h.onUndo).toHaveBeenCalledTimes(1);
    expect(h.onCommit).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Abrir Hábito'));
    expect(h.onOpen).toHaveBeenCalledTimes(1);
  });
});
