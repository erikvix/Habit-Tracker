import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import type { Level } from '@/domain/types';

import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export interface BarPoint {
  key: string;
  /** Rótulo curto sob a barra (ex.: 'N'). */
  label: string;
  /** 0–1; null = sem dados (desenha um tracinho). */
  value: number | null;
  level: Level;
}

interface Props {
  points: readonly BarPoint[];
  selectedKey?: string;
  onSelect?: (key: string) => void;
  height?: number;
  accessibilityLabel?: string;
}

const LABEL_H = 20; // rótulo + traço de seleção
const TOP = 4;

/** Barras verticais (0–100%) com as cores de nível do contribution graph. */
export function BarChart({
  points,
  selectedKey,
  onSelect,
  height = 120,
  accessibilityLabel = 'Gráfico de barras',
}: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const chartH = height - LABEL_H - TOP;
  const slot = points.length > 0 ? width / points.length : 0;
  const barW = Math.max(4, Math.min(28, slot * 0.6));
  const baseY = TOP + chartH;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height }}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          {/* Linhas de referência: 50% e 100%. */}
          {[0.5, 1].map((r) => (
            <Line
              key={r}
              x1={0}
              x2={width}
              y1={baseY - chartH * r}
              y2={baseY - chartH * r}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          ))}
          <Line x1={0} x2={width} y1={baseY} y2={baseY} stroke={colors.border} strokeWidth={1} />

          {points.map((p, i) => {
            const cx = slot * i + slot / 2;
            if (p.value === null) {
              return (
                <Line
                  key={`v-${p.key}`}
                  testID={`empty-${p.key}`}
                  x1={cx - barW / 2}
                  x2={cx + barW / 2}
                  y1={baseY - 1}
                  y2={baseY - 1}
                  stroke={colors.textMuted}
                  strokeWidth={2}
                />
              );
            }
            const h = Math.max(p.value > 0 ? 2 : 0, chartH * p.value);
            return (
              <Rect
                key={`v-${p.key}`}
                x={cx - barW / 2}
                y={baseY - h}
                width={barW}
                height={h}
                rx={2}
                testID={`fill-${p.key}`}
                fill={p.level === 0 ? colors.border : colors.levels[p.level]}
              />
            );
          })}

          {/* Mês selecionado: rótulo em destaque + traço verde embaixo (sem borda na barra). */}
          {points.map((p, i) =>
            p.key === selectedKey ? (
              <Rect
                key={`s-${p.key}`}
                testID={`selected-${p.key}`}
                x={slot * i + slot / 2 - 6}
                y={height - 3}
                width={12}
                height={2}
                rx={1}
                fill={colors.levels[4]}
              />
            ) : null,
          )}

          {points.map((p, i) => (
            <SvgText
              key={`l-${p.key}`}
              testID={`label-${p.key}`}
              x={slot * i + slot / 2}
              y={height - 7}
              // Rótulos de 3 letras: fonte menor quando cada mês tem pouco espaço.
              fontSize={slot < 22 ? 9 : 10}
              fontFamily={fonts.mono}
              fontWeight={p.key === selectedKey ? '700' : '400'}
              fill={p.key === selectedKey ? colors.text : colors.textMuted}
              textAnchor="middle"
            >
              {p.label}
            </SvgText>
          ))}

          {/* Camada de toque por cima: o slot inteiro, não só a barra (barras baixas são difíceis de acertar). */}
          {onSelect
            ? points.map((p, i) => (
                <Rect
                  key={`t-${p.key}`}
                  testID={`bar-${p.key}`}
                  x={slot * i}
                  y={0}
                  width={slot}
                  height={height}
                  fill="transparent"
                  onPress={() => onSelect(p.key)}
                />
              ))
            : null}
        </Svg>
      ) : null}
    </View>
  );
}
