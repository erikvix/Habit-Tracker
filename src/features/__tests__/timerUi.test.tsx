import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { history } from '@/domain/__tests__/helpers';
import { AppThemeProvider } from '@/ui/theme/ThemeProvider';

import { StopTimerSheet } from '../timer/StopTimerSheet';
import { HabitCard, type CardTimer } from '../today/HabitCard';
import { buildTodayList } from '../today/model';

const TODAY = '2026-11-18';
const renderThemed = (ui: ReactElement) => render(<AppThemeProvider>{ui}</AppThemeProvider>);

function card(goalType: 'time' | 'count', timer?: CardTimer) {
  const h = history({
    name: 'Leitura',
    goalType,
    startDate: '2026-11-01',
    schedules: [['2026-11-01', 30]],
    progress: { [TODAY]: 10 },
  });
  const item = buildTodayList([h], TODAY).active[0]!;
  return renderThemed(
    <HabitCard item={item} onCommit={() => {}} onUndo={() => {}} onOpen={() => {}} timer={timer} />,
  );
}

const timer = (elapsed: string | null): CardTimer => ({
  elapsed,
  onStart: jest.fn(),
  onStop: jest.fn(),
  onDiscard: jest.fn(),
});

describe('HabitCard com cronômetro', () => {
  it('parado: mostra ▶ junto de −, +5, +15', async () => {
    const t = timer(null);
    await card('time', t);
    await fireEvent.press(screen.getByLabelText('Iniciar cronômetro de Leitura'));
    expect(t.onStart).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Adicionar 5 minutos a Leitura')).toBeTruthy();
  });

  it('rodando: mostra o tempo, Parar e Descartar; esconde +5/+15', async () => {
    const t = timer('12:34');
    await card('time', t);
    expect(screen.getByLabelText('Cronometrando 12:34')).toBeTruthy();
    expect(screen.queryByLabelText('Adicionar 5 minutos a Leitura')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Parar cronômetro de Leitura'));
    await fireEvent.press(screen.getByLabelText('Descartar cronômetro de Leitura'));
    expect(t.onStop).toHaveBeenCalledTimes(1);
    expect(t.onDiscard).toHaveBeenCalledTimes(1);
  });

  it('hábito de contagem não tem cronômetro', async () => {
    await card('count');
    expect(screen.queryByLabelText(/cronômetro/)).toBeNull();
  });
});

describe('StopTimerSheet', () => {
  const startedAt = new Date(2026, 10, 18, 9, 0).toISOString();
  const props = (now: Date) => ({
    request: { habitId: 'h', habitName: 'Leitura', startedAt },
    now,
    rolloverHour: 0,
    onConfirm: jest.fn(),
    onDiscard: jest.fn(),
    onClose: jest.fn(),
  });

  it('sugere o tempo decorrido e permite ajustar antes de registrar', async () => {
    const p = props(new Date(2026, 10, 18, 9, 25));
    await renderThemed(<StopTimerSheet {...p} />);
    expect(screen.getByText('Registrar 25 min em Leitura?')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Diminuir minutos a registrar'));
    await fireEvent.press(screen.getByText('Registrar'));
    expect(p.onConfirm).toHaveBeenCalledWith(20);
  });

  it('sessão que passou da meia-noite avisa o dia de registro', async () => {
    const p = {
      ...props(new Date(2026, 10, 19, 0, 20)),
      request: {
        habitId: 'h',
        habitName: 'Leitura',
        startedAt: new Date(2026, 10, 18, 23, 40).toISOString(),
      },
    };
    await renderThemed(<StopTimerSheet {...p} />);
    expect(screen.getByText(/conta em qua, 18 nov/)).toBeTruthy();
  });

  it('menos de 1 minuto: nada a registrar', async () => {
    const p = props(new Date(2026, 10, 18, 9, 0, 20));
    await renderThemed(<StopTimerSheet {...p} />);
    expect(screen.getByText('Sessão muito curta')).toBeTruthy();
    await fireEvent.press(screen.getByText('OK'));
    expect(p.onDiscard).toHaveBeenCalledTimes(1);
    expect(p.onConfirm).not.toHaveBeenCalled();
  });
});
