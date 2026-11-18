import { Platform } from 'react-native';

export type ColorSchemeName = 'dark' | 'light';
export type ThemePreference = 'system' | ColorSchemeName;

/** Níveis do contribution graph: índice 0–4. */
export type LevelColors = readonly [string, string, string, string, string];

export interface ThemeColors {
  canvas: string; // fundo da tela
  surface: string; // cards, header, tab bar
  surfaceMuted: string; // controles segmentados, inputs
  border: string;
  text: string;
  textMuted: string;
  accent: string; // links / foco / item ativo
  success: string;
  danger: string;
  /** Concluído (roxo "done" do GitHub). */
  done: string;
  /** Destaque de atenção (laranja/amarelo do GitHub), ex.: chama da sequência. */
  attention: string;
  buttonPrimaryBg: string;
  buttonPrimaryBorder: string;
  buttonPrimaryText: string;
  buttonBg: string;
  levels: LevelColors;
}

export const darkColors: ThemeColors = {
  canvas: '#0d1117',
  surface: '#161b22',
  surfaceMuted: '#21262d',
  border: '#30363d',
  text: '#e6edf3',
  textMuted: '#7d8590',
  accent: '#2f81f7',
  success: '#3fb950',
  danger: '#f85149',
  done: '#8957e5',
  attention: '#d29922',
  buttonPrimaryBg: '#238636',
  buttonPrimaryBorder: 'rgba(240,246,252,0.1)',
  buttonPrimaryText: '#ffffff',
  buttonBg: '#21262d',
  levels: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
};

export const lightColors: ThemeColors = {
  canvas: '#ffffff',
  surface: '#f6f8fa',
  surfaceMuted: '#eaeef2',
  border: '#d0d7de',
  text: '#1f2328',
  textMuted: '#656d76',
  accent: '#0969da',
  success: '#1a7f37',
  danger: '#d1242f',
  done: '#8250df',
  attention: '#9a6700',
  buttonPrimaryBg: '#1f883d',
  buttonPrimaryBorder: 'rgba(31,35,40,0.15)',
  buttonPrimaryText: '#ffffff',
  buttonBg: '#f6f8fa',
  levels: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
};

export const palettes: Record<ColorSchemeName, ThemeColors> = {
  dark: darkColors,
  light: lightColors,
};

export const fonts = {
  // Fonte do sistema (Roboto no Android), como o GitHub usa a pilha do sistema.
  sans: Platform.select({ ios: 'System', default: undefined }),
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 8, lg: 12 } as const;
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 } as const;
