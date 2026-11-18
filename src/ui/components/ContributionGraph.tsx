import { memo, useRef } from 'react';
import { ScrollView, type ScrollViewInstance } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import type { MonthLabel } from '@/domain/contributionGrid';
import type { Level, LocalDate, Weekday } from '@/domain/types';
import { monthShortLabel } from '@/features/shared/model';

import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export interface ContributionCell {
  date: LocalDate;
  level: Level;
  /** Dia de descanso (inativo, sem commit): só contorno. */
  rest?: boolean;
  future?: boolean;
}

interface Props {
  weeks: readonly (readonly ContributionCell[])[];
  monthLabels: readonly MonthLabel[];
  weekStart?: Weekday;
  selected?: LocalDate | null;
  onPressDay?: (date: LocalDate) => void;
  cell?: number;
  gap?: number;
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
const LEFT = 30;
const TOP = 18;

/**
 * Gráfico de contribuições (estilo GitHub) em SVG.
 * Componente "burro": recebe a grade pronta (ver habitGraphData) e só desenha.
 * Abre rolado até a semana atual.
 */
export const ContributionGraph = memo(function ContributionGraph({
  weeks,
  monthLabels,
  weekStart = 0,
  selected,
  onPressDay,
  cell = 11,
  gap = 3,
}: Props) {
  const { colors, scheme } = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  const pitch = cell + gap;
  const width = LEFT + weeks.length * pitch;
  const height = TOP + 7 * pitch;
  const outline = scheme === 'dark' ? 'rgba(240,246,252,0.06)' : 'rgba(31,35,40,0.06)';

  // Rótulos nas linhas 1, 3 e 5 (Seg/Qua/Sex quando a semana começa no domingo).
  const rowLabels = [1, 3, 5].map((row) => ({
    row,
    label: DAY_LABELS[(weekStart + row) % 7]!,
  }));

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      accessibilityLabel="Gráfico de contribuições dos últimos 12 meses"
    >
      <Svg width={width} height={height}>
        {monthLabels.map((m) => (
          <SvgText
            key={`${m.month}-${m.column}`}
            x={LEFT + m.column * pitch}
            y={11}
            fontSize={10}
            fontFamily={fonts.sans}
            fill={colors.textMuted}
          >
            {monthShortLabel(m.month)}
          </SvgText>
        ))}
        {rowLabels.map(({ row, label }) => (
          <SvgText
            key={row}
            x={0}
            y={TOP + row * pitch + cell - 2}
            fontSize={9}
            fontFamily={fonts.sans}
            fill={colors.textMuted}
          >
            {label}
          </SvgText>
        ))}
        {weeks.map((week, w) => (
          <G key={week[0]?.date ?? w} x={LEFT + w * pitch} y={TOP}>
            {week.map((c, r) => {
              if (c.future) return null;
              const isSelected = c.date === selected;
              return (
                <Rect
                  key={c.date}
                  testID={`cell-${c.date}`}
                  y={r * pitch}
                  width={cell}
                  height={cell}
                  rx={2}
                  fill={c.rest ? 'none' : colors.levels[c.level]}
                  stroke={isSelected ? colors.text : c.rest ? colors.border : outline}
                  strokeWidth={isSelected ? 1.5 : 1}
                  onPress={onPressDay ? () => onPressDay(c.date) : undefined}
                />
              );
            })}
          </G>
        ))}
      </Svg>
    </ScrollView>
  );
});
