// Gera assets/brand/*.svg e assets/images/*.png a partir de src/ui/brand/logo.json.
// Uso: npm run icons
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const L = JSON.parse(readFileSync(join(root, 'src/ui/brand/logo.json'), 'utf8'));
const C = L.size / 2;

/**
 * @param {object} o
 * @param {boolean} [o.background] fundo escuro opaco
 * @param {number} [o.scale] escala do símbolo em torno do centro (área segura do adaptive icon)
 * @param {number} [o.strokeBoost] multiplicador dos contornos (favicon pequeno)
 * @param {boolean} [o.mono] versão monocromática (só alfa importa)
 */
function svg({ background = false, scale = 1, strokeBoost = 1, mono = false } = {}) {
  const f = L.frame;
  const frameStroke = mono ? '#ffffff' : f.stroke;
  const circles = L.circles
    .map((c, i) => {
      const fill = mono ? '#ffffff' : c.fill;
      const opacity = mono ? [0.45, 0.7, 1][i] : 1;
      const stroke = mono ? 'none' : L.circleStroke;
      return `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="${L.circleStrokeWidth * strokeBoost}"/>`;
    })
    .join('\n    ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L.size}" height="${L.size}" viewBox="0 0 ${L.size} ${L.size}">
  ${background ? `<rect width="${L.size}" height="${L.size}" fill="${L.background}"/>` : ''}
  <g transform="translate(${C} ${C}) scale(${scale}) translate(${-C} ${-C})">
    <rect x="${f.x}" y="${f.y}" width="${f.size}" height="${f.size}" rx="${f.radius}" fill="none" stroke="${frameStroke}" stroke-width="${f.strokeWidth * strokeBoost}"/>
    ${circles}
  </g>
</svg>
`;
}

function png(svgText, width, file) {
  const out = new Resvg(svgText, { fitTo: { mode: 'width', value: width } }).render().asPng();
  writeFileSync(join(root, file), out);
  console.log(`✓ ${file} (${width}px)`);
}

mkdirSync(join(root, 'assets/brand'), { recursive: true });
mkdirSync(join(root, 'assets/images'), { recursive: true });

const logo = svg({ background: true });
const favicon = svg({ background: true, scale: 1.12, strokeBoost: 2.2 });
writeFileSync(join(root, 'assets/brand/logo.svg'), logo);
writeFileSync(join(root, 'assets/brand/logo-transparent.svg'), svg());
writeFileSync(join(root, 'assets/brand/logo-favicon.svg'), favicon);
console.log('✓ assets/brand/*.svg');

png(logo, 1024, 'assets/images/icon.png');
// Adaptive icon: conteúdo dentro do círculo seguro (~61% do canvas).
png(svg({ scale: 0.56 }), 1024, 'assets/images/android-icon-foreground.png');
png(svg({ scale: 0.56, mono: true }), 1024, 'assets/images/android-icon-monochrome.png');
png(svg(), 1024, 'assets/images/splash-icon.png');
png(favicon, 48, 'assets/images/favicon.png');
// Ícone pequeno da notificação (Android): branco sobre transparente, 96px.
png(svg({ scale: 1.1, strokeBoost: 2, mono: true }), 96, 'assets/images/notification-icon.png');
