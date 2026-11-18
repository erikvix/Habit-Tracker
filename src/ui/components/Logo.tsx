import Svg, { Circle, Rect } from 'react-native-svg';

import logo from '../brand/logo.json';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Logo vetorial — mesma geometria usada por scripts/generate-icons.mjs.
 * O contorno cinza-claro foi desenhado para fundo escuro; no tema claro a logo
 * ganha o "tile" escuro do ícone para manter o contraste.
 */
export function Logo({ size = 64 }: { size?: number }) {
  const { scheme } = useTheme();
  const f = logo.frame;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${logo.size} ${logo.size}`}>
      {scheme === 'light' ? (
        <Rect width={logo.size} height={logo.size} rx={220} fill={logo.background} />
      ) : null}
      <Rect
        x={f.x}
        y={f.y}
        width={f.size}
        height={f.size}
        rx={f.radius}
        fill="none"
        stroke={f.stroke}
        strokeWidth={f.strokeWidth}
      />
      {logo.circles.map((c) => (
        <Circle
          key={c.cx}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill={c.fill}
          stroke={logo.circleStroke}
          strokeWidth={logo.circleStrokeWidth}
        />
      ))}
    </Svg>
  );
}
