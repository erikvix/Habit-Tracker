import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { BarChart, type BarPoint } from '@/ui/components/BarChart';
import { MonthSwitcher } from '@/ui/components/MonthSwitcher';
import { AppThemeProvider } from '@/ui/theme/ThemeProvider';

import { monthAbbr } from '../shared/model';

const renderThemed = (ui: ReactElement) => render(<AppThemeProvider>{ui}</AppThemeProvider>);

const points: BarPoint[] = Array.from({ length: 12 }, (_, i) => {
  const key = `2026-${String(i + 1).padStart(2, '0')}`;
  // Jan–Mar sem dados; o resto com valores crescentes.
  const value = i < 3 ? null : i / 11;
  return { key, label: monthAbbr(key), value, level: value === null ? 0 : 3 };
});

describe('BarChart', () => {
  it('desenha 12 alvos de toque, tracinho nos meses sem dados e seleciona ao tocar', async () => {
    const onSelect = jest.fn();
    await renderThemed(
      <BarChart
        points={points}
        selectedKey="2026-11"
        onSelect={onSelect}
        accessibilityLabel="barras"
      />,
    );
    // O SVG só é desenhado depois de medir a largura.
    await fireEvent(screen.getByLabelText('barras'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 120, x: 0, y: 0 } },
    });
    expect(screen.getAllByTestId(/^bar-/)).toHaveLength(12);
    // Rótulos de mês legíveis: jan … dez.
    // No react-native-svg o texto fica num TSpan filho, na prop `content`.
    const labels = screen
      .getAllByTestId(/^label-/)
      .map((l) => (l.children[0] as { props: Record<string, unknown> }).props.content);
    expect(labels).toEqual([
      'jan',
      'fev',
      'mar',
      'abr',
      'mai',
      'jun',
      'jul',
      'ago',
      'set',
      'out',
      'nov',
      'dez',
    ]);
    expect(screen.getAllByTestId(/^empty-/)).toHaveLength(3);
    // Selecionado: só o traço sob o rótulo; a barra não ganha contorno.
    expect(screen.getAllByTestId(/^selected-/)).toHaveLength(1);
    expect(screen.getByTestId('selected-2026-11')).toBeTruthy();
    expect(screen.getByTestId('fill-2026-11').props.stroke).toBeUndefined();
    await fireEvent.press(screen.getByTestId('bar-2026-05'));
    expect(onSelect).toHaveBeenCalledWith('2026-05');
  });
});

describe('MonthSwitcher', () => {
  it('não avança além do máximo nem volta antes do mínimo', async () => {
    const onChange = jest.fn();
    await renderThemed(
      <MonthSwitcher month="2026-11" max="2026-11" min="2026-10" onChange={onChange} />,
    );
    expect(screen.getByText('Novembro 2026')).toBeTruthy();
    expect(screen.getByLabelText('Próximo mês').props.accessibilityState).toMatchObject({
      disabled: true,
    });
    await fireEvent.press(screen.getByLabelText('Mês anterior'));
    expect(onChange).toHaveBeenCalledWith('2026-10');
  });

  it('no mínimo, o anterior fica desabilitado', async () => {
    await renderThemed(
      <MonthSwitcher month="2026-10" max="2026-11" min="2026-10" onChange={() => {}} />,
    );
    expect(screen.getByLabelText('Mês anterior').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });
});
