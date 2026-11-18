import { buildContributionGrid } from '../contributionGrid';
import type { MonthEfficiency } from '../efficiency';
import { rankByEfficiency } from '../ranking';

describe('buildContributionGrid', () => {
  const grid = buildContributionGrid('2026-11-18', 53, 0);

  it('53 colunas × 7 linhas, começando no domingo', () => {
    expect(grid.weeks).toHaveLength(53);
    expect(grid.weeks.every((w) => w.length === 7)).toBe(true);
    expect(new Date(`${grid.start}T00:00:00Z`).getUTCDay()).toBe(0);
  });

  it('última coluna é a semana atual; dias após hoje são futuros', () => {
    const last = grid.weeks[52]!;
    expect(last[0]!.date).toBe('2026-11-15');
    expect(last[3]).toMatchObject({ date: '2026-11-18', future: false });
    expect(last[4]).toMatchObject({ date: '2026-11-19', future: true });
    expect(last[6]!.date).toBe('2026-11-21');
  });

  it('cobre pelo menos 12 meses para trás', () => {
    expect(grid.start <= '2025-11-18').toBe(true);
  });

  it('rótulos de mês em ordem e sem encavalar no início', () => {
    const cols = grid.monthLabels.map((l) => l.column);
    expect(cols).toEqual([...cols].sort((a, b) => a - b));
    for (let i = 1; i < cols.length; i++) expect(cols[i]! - cols[i - 1]!).toBeGreaterThanOrEqual(3);
    expect(grid.monthLabels.at(-1)!.month).toBe('2026-11');
  });

  it('semana começando na segunda', () => {
    const g = buildContributionGrid('2026-11-18', 1, 1);
    expect(g.weeks[0]!.map((c) => c.date)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ]);
  });
});

describe('rankByEfficiency', () => {
  const m = (efficiency: number | null, metDays: number): MonthEfficiency => ({
    month: '2026-11',
    activeDays: 10,
    metDays,
    efficiency,
  });

  it('eficiência desc → dias cumpridos → nome; null no fim', () => {
    const ranked = rankByEfficiency([
      { habitId: 'a', name: 'Água', month: m(0.5, 5) },
      { habitId: 'b', name: 'Bike', month: m(null, 0) },
      { habitId: 'c', name: 'Cama', month: m(1, 3) },
      { habitId: 'd', name: 'Dente', month: m(0.5, 9) },
      { habitId: 'e', name: 'Estudo', month: m(0.5, 5) },
    ]);
    expect(ranked.map((r) => r.habitId)).toEqual(['c', 'd', 'a', 'e', 'b']);
  });
});
