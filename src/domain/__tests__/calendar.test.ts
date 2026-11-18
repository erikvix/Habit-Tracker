import { buildMonthGrid, weekdayOrder } from '../calendar';

describe('buildMonthGrid', () => {
  it('novembro/2026 começando no domingo: 1º cai no domingo', () => {
    const g = buildMonthGrid('2026-11', 0);
    expect(g[0]).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
    ]);
    expect(g).toHaveLength(5);
    expect(g[4]).toEqual(['2026-11-29', '2026-11-30', null, null, null, null, null]);
  });

  it('semana começando na segunda desloca o início', () => {
    const g = buildMonthGrid('2026-11', 1);
    expect(g[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(g.flat().filter(Boolean)).toHaveLength(30);
  });

  it('fevereiro bissexto e virada de ano', () => {
    expect(buildMonthGrid('2028-02').flat().filter(Boolean).at(-1)).toBe('2028-02-29');
    expect(buildMonthGrid('2026-02').flat().filter(Boolean).at(-1)).toBe('2026-02-28');
    const dec = buildMonthGrid('2026-12').flat().filter(Boolean);
    expect([dec[0], dec.at(-1)]).toEqual(['2026-12-01', '2026-12-31']);
  });

  it('todas as linhas têm 7 posições e nenhum dia se repete', () => {
    const g = buildMonthGrid('2027-05', 0);
    expect(g.every((w) => w.length === 7)).toBe(true);
    const days = g.flat().filter(Boolean);
    expect(new Set(days).size).toBe(31);
  });

  it('weekdayOrder', () => {
    expect(weekdayOrder(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(weekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});
