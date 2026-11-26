import Svg, { Circle, Rect } from 'react-native-svg';

import logo from '../brand/logo.json';
import { useTheme } from '../theme/ThemeProvider';

/** Recorte em volta das bolinhas: mesma proporção do icon.png (scripts/generate-icons.mjs, scale 1.15). */
const HALF = Math.round(logo.size / 2 / 1.15);
const ORIGIN = logo.size / 2 - HALF;
const VIEW = 2 * HALF;

/**
 * Logo vetorial: só as bolinhas de commit, sem contorno, como os ícones.
 * No tema claro ganha o "tile" escuro do ícone, porque a bolinha mais escura some no fundo claro.
 */
export function Logo({ size = 64 }: { size?: number }) {
  const { scheme } = useTheme();
  return (
    <Svg width={size} height={size} viewBox={`${ORIGIN} ${ORIGIN} ${VIEW} ${VIEW}`}>
      {scheme === 'light' ? (
        <Rect
          x={ORIGIN}
          y={ORIGIN}
          width={VIEW}
          height={VIEW}
          rx={VIEW * 0.215}
          fill={logo.background}
        />
      ) : null}
      {logo.circles.map((c) => (
        <Circle key={c.cx} cx={c.cx} cy={c.cy} r={c.r} fill={c.fill} />
      ))}
    </Svg>
  );
}
