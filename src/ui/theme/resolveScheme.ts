import type { ColorSchemeName, ThemePreference } from './tokens';

/** Preferência do usuário + esquema do sistema → esquema efetivo (padrão: escuro). */
export function resolveScheme(
  preference: ThemePreference,
  system: string | null | undefined,
): ColorSchemeName {
  if (preference !== 'system') return preference;
  return system === 'light' ? 'light' : 'dark';
}
