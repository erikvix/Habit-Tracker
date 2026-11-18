import {
  ALL_DAYS,
  createScheduleResolver,
  isActiveDay,
  maskFromWeekdays,
  targetForDate,
  weekdaysFromMask,
} from '../schedule';
import { history } from './helpers';

describe('máscara de dias', () => {
  it('ida e volta', () => {
    const mask = maskFromWeekdays([1, 3, 5]);
    expect(mask).toBe(0b0101010);
    expect(weekdaysFromMask(mask)).toEqual([1, 3, 5]);
    expect(weekdaysFromMask(ALL_DAYS)).toHaveLength(7);
  });
});

describe('resolução da meta vigente (versionamento)', () => {
  const h = history({
    startDate: '2026-01-01',
    schedules: [
      ['2026-03-15', 4],
      ['2026-01-01', 8], // fora de ordem de propósito
      ['2026-06-01', 10],
    ],
  });
  const resolve = createScheduleResolver(h.schedules);

  it.each([
    ['2025-12-31', undefined],
    ['2026-01-01', 8],
    ['2026-03-14', 8],
    ['2026-03-15', 4],
    ['2026-05-31', 4],
    ['2026-06-01', 10],
    ['2030-01-01', 10],
  ])('%s → %s', (date, target) => {
    expect(resolve(date)?.dailyTarget).toBe(target);
  });

  it('targetForDate usa a versão mais antiga antes da primeira vigência', () => {
    expect(targetForDate(resolve, h.schedules, '2025-06-01')).toBe(8);
  });

  it('sem versões → undefined', () => {
    expect(createScheduleResolver([])('2026-01-01')).toBeUndefined();
  });
});

describe('isActiveDay', () => {
  it('respeita startDate, arquivamento e dias da semana', () => {
    // Só seg/qua/sex a partir de 2026-11-02 (segunda); arquivado em 2026-11-20.
    const h = history({
      startDate: '2026-11-02',
      archivedAt: '2026-11-20',
      schedules: [['2026-11-02', 1, maskFromWeekdays([1, 3, 5])]],
    });
    const r = createScheduleResolver(h.schedules);
    expect(isActiveDay(h.habit, r, '2026-11-01')).toBe(false); // antes do início
    expect(isActiveDay(h.habit, r, '2026-11-02')).toBe(true); // segunda
    expect(isActiveDay(h.habit, r, '2026-11-03')).toBe(false); // terça
    expect(isActiveDay(h.habit, r, '2026-11-18')).toBe(true); // quarta
    expect(isActiveDay(h.habit, r, '2026-11-20')).toBe(false); // dia do arquivamento
  });

  it('mudança de dias ativos vale só a partir da nova versão', () => {
    const h = history({
      startDate: '2026-11-01',
      schedules: [
        ['2026-11-01', 1, ALL_DAYS],
        ['2026-11-15', 1, maskFromWeekdays([1])], // só segunda depois
      ],
    });
    const r = createScheduleResolver(h.schedules);
    expect(isActiveDay(h.habit, r, '2026-11-10')).toBe(true); // terça, versão antiga
    expect(isActiveDay(h.habit, r, '2026-11-17')).toBe(false); // terça, versão nova
    expect(isActiveDay(h.habit, r, '2026-11-16')).toBe(true); // segunda
  });
});
