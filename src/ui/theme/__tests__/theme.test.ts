import { resolveScheme } from '../resolveScheme';
import { darkColors, lightColors } from '../tokens';

describe('paleta GitHub', () => {
  it('usa os níveis do contribution graph especificados (dark)', () => {
    expect(darkColors.levels).toEqual(['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']);
  });

  it('usa os níveis do contribution graph especificados (light)', () => {
    expect(lightColors.levels).toEqual(['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']);
  });

  it('usa as cores base especificadas', () => {
    expect(darkColors).toMatchObject({
      canvas: '#0d1117',
      surface: '#161b22',
      border: '#30363d',
      text: '#e6edf3',
      textMuted: '#7d8590',
      accent: '#2f81f7',
    });
    expect(lightColors).toMatchObject({ canvas: '#ffffff', border: '#d0d7de', text: '#1f2328' });
  });
});

describe('resolveScheme', () => {
  it('respeita preferência explícita', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });

  it('segue o sistema e cai para escuro quando desconhecido', () => {
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', null)).toBe('dark');
  });
});
