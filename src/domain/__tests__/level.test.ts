import { createHabitEvaluator } from '../habitDay';
import { habitLevel, isGoalMet, relativeLevel } from '../level';
import { maskFromWeekdays } from '../schedule';
import { history } from './helpers';

describe('habitLevel (contagem, meta 8)', () => {
  it.each([
    [0, 0],
    [1, 1], // 12,5%
    [2, 2], // 25% exato → 2
    [3, 2], // 37,5%
    [4, 3], // 50% exato → 3
    [7, 3], // 87,5%
    [8, 4], // 100%
    [12, 4], // acima da meta
  ])('%i/8 → nível %i', (p, level) => {
    expect(habitLevel(p, 8, 'count')).toBe(level);
  });
});

describe('habitLevel (tempo, meta 30 min)', () => {
  it.each([
    [1, 1],
    [7, 1], // 23%
    [8, 2], // 26,7%
    [14, 2],
    [15, 3], // 50%
    [29, 3],
    [30, 4],
  ])('%i min → nível %i', (p, level) => {
    expect(habitLevel(p, 30, 'time')).toBe(level);
  });

  it('qualquer progresso vale pelo menos 1, mesmo < 1% da meta', () => {
    expect(habitLevel(1, 1000, 'time')).toBe(1);
  });
});

describe('habitLevel (binário)', () => {
  it('0 ou 4', () => {
    expect(habitLevel(0, 1, 'binary')).toBe(0);
    expect(habitLevel(1, 1, 'binary')).toBe(4);
    expect(habitLevel(1, 5, 'binary')).toBe(4); // meta ignorada
  });
});

describe('isGoalMet', () => {
  it('contagem/tempo exigem progresso ≥ meta; binário exige > 0', () => {
    expect(isGoalMet(7, 8, 'count')).toBe(false);
    expect(isGoalMet(8, 8, 'count')).toBe(true);
    expect(isGoalMet(1, 1, 'binary')).toBe(true);
    expect(isGoalMet(0, 1, 'binary')).toBe(false);
  });

  it('meta 0 (defensivo) é cumprida com qualquer progresso', () => {
    expect(isGoalMet(1, 0, 'count')).toBe(true);
    expect(habitLevel(1, 0, 'count')).toBe(4);
  });
});

describe('relativeLevel (agregado estilo GitHub)', () => {
  it.each([
    [0, 8, 0],
    [1, 8, 1],
    [2, 8, 1], // 25% → 1
    [3, 8, 2],
    [4, 8, 2], // 50% → 2
    [5, 8, 3],
    [6, 8, 3], // 75% → 3
    [7, 8, 4],
    [8, 8, 4],
    [1, 1, 4], // máximo único
    [3, 0, 0], // defensivo
  ])('%i de máx %i → %i', (v, max, level) => {
    expect(relativeLevel(v, max)).toBe(level);
  });
});

describe('createHabitEvaluator', () => {
  it('dia inativo com commit: colorido, met, mas não ativo', () => {
    const h = history({
      goalType: 'count',
      startDate: '2026-11-01',
      schedules: [['2026-11-01', 4, maskFromWeekdays([1, 2, 3, 4, 5])]],
      progress: { '2026-11-21': 4 }, // sábado
    });
    const day = createHabitEvaluator(h)('2026-11-21');
    expect(day).toMatchObject({ active: false, level: 4, met: true, target: 4 });
  });

  it('meta trocada: cada dia usa a sua versão', () => {
    const h = history({
      goalType: 'count',
      startDate: '2026-11-01',
      schedules: [
        ['2026-11-01', 8],
        ['2026-11-10', 4],
      ],
      progress: { '2026-11-09': 4, '2026-11-10': 4 },
    });
    const ev = createHabitEvaluator(h);
    expect(ev('2026-11-09')).toMatchObject({ target: 8, level: 3, met: false });
    expect(ev('2026-11-10')).toMatchObject({ target: 4, level: 4, met: true });
  });
});
