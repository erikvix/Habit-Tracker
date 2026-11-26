// Gera assets/brand/*.svg e assets/images/*.png a partir de src/ui/brand/logo.json.
// Os ícones têm só as bolinhas, sem contorno: a máscara do launcher faz a borda.
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
 * @param {boolean} [o.mono] versão monocromática (só alfa importa)
 */
function svg({ background = false, scale = 1, mono = false } = {}) {
  const circles = L.circles
    .map((c, i) => {
      const fill = mono ? '#ffffff' : c.fill;
      const opacity = mono ? [0.45, 0.7, 1][i] : 1;
      return `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${fill}" fill-opacity="${opacity}"/>`;
    })
    .join('\n    ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L.size}" height="${L.size}" viewBox="0 0 ${L.size} ${L.size}">
  ${background ? `<rect width="${L.size}" height="${L.size}" fill="${L.background}"/>` : ''}
  <g transform="translate(${C} ${C}) scale(${scale}) translate(${-C} ${-C})">
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

// As bolinhas ocupam ~59% da largura em scale 1 (x 210..814, centradas).
const logo = svg({ background: true, scale: 1.15 });
const favicon = svg({ background: true, scale: 1.4 });
writeFileSync(join(root, 'assets/brand/logo.svg'), logo);
writeFileSync(join(root, 'assets/brand/logo-transparent.svg'), svg());
writeFileSync(join(root, 'assets/brand/logo-favicon.svg'), favicon);
console.log('✓ assets/brand/*.svg');

png(logo, 1024, 'assets/images/icon.png');
// Adaptive icon: área visível 72/108 do canvas, segura 66/108 (raio ~313px em 1024).
// Em scale 0.8 a bolinha mais distante chega a ~242px do centro: folga dentro da área segura.
png(svg({ scale: 0.8 }), 1024, 'assets/images/android-icon-foreground.png');
png(svg({ scale: 0.8, mono: true }), 1024, 'assets/images/android-icon-monochrome.png');
png(svg(), 1024, 'assets/images/splash-icon.png');
png(favicon, 48, 'assets/images/favicon.png');
// Ícone pequeno da notificação (Android): branco sobre transparente, 96px.
png(svg({ scale: 1.5, mono: true }), 96, 'assets/images/notification-icon.png');
