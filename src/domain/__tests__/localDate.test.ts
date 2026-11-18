import {
  addDays,
  addMonths,
  diffDays,
  eachDay,
  eachMonth,
  endOfMonth,
  isValidLocalDate,
  makeLocalDate,
  startOfWeek,
  toLocalDate,
  weekday,
} from '../localDate';

describe('isValidLocalDate', () => {
  it.each([
    ['2026-11-18', true],
    ['2028-02-29', true], // bissexto
    ['2026-02-29', false],
    ['2026-13-01', false],
    ['2026-1-01', false],
    ['18/11/2026', false],
  ])('%s → %s', (v, ok) => expect(isValidLocalDate(v)).toBe(ok));

  it('makeLocalDate rejeita data inexistente', () => {
    expect(() => makeLocalDate(2026, 2, 30)).toThrow();
  });
});

describe('toLocalDate (dia lógico)', () => {
  // Datas criadas com componentes locais: o teste independe do fuso da máquina.
  it('sem virada: meia-noite separa os dias', () => {
    expect(toLocalDate(new Date(2026, 10, 18, 0, 0))).toBe('2026-11-18');
    expect(toLocalDate(new Date(2026, 10, 17, 23, 59))).toBe('2026-11-17');
  });

  it('com virada às 4h: madrugada conta no dia anterior', () => {
    expect(toLocalDate(new Date(2026, 10, 18, 1, 30), 4)).toBe('2026-11-17');
    expect(toLocalDate(new Date(2026, 10, 18, 3, 59), 4)).toBe('2026-11-17');
    expect(toLocalDate(new Date(2026, 10, 18, 4, 0), 4)).toBe('2026-11-18');
  });

  it('virada atravessa mês e ano', () => {
    expect(toLocalDate(new Date(2027, 0, 1, 2, 0), 4)).toBe('2026-12-31');
    expect(toLocalDate(new Date(2026, 2, 1, 2, 0), 4)).toBe('2026-02-28');
  });

  it('rejeita hora de virada inválida', () => {
    expect(() => toLocalDate(new Date(), 24)).toThrow();
    expect(() => toLocalDate(new Date(), -1)).toThrow();
  });
});

describe('aritmética', () => {
  it('addDays cruza mês, ano e 29/02', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('addDays é imune a horário de verão (datas de DST no Brasil antigo e EUA)', () => {
    expect(addDays('2018-11-03', 1)).toBe('2018-11-04');
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
  });

  it('diffDays', () => {
    expect(diffDays('2026-01-01', '2026-12-31')).toBe(364);
    expect(diffDays('2028-01-01', '2028-12-31')).toBe(365);
    expect(diffDays('2026-11-18', '2026-11-10')).toBe(-8);
  });

  it('weekday: 0 = domingo', () => {
    expect(weekday('2026-11-15')).toBe(0);
    expect(weekday('2026-11-18')).toBe(3);
    expect(weekday('2026-11-21')).toBe(6);
  });

  it('endOfMonth considera bissexto', () => {
    expect(endOfMonth('2026-02')).toBe('2026-02-28');
    expect(endOfMonth('2028-02')).toBe('2028-02-29');
    expect(endOfMonth('2026-12')).toBe('2026-12-31');
  });

  it('addMonths / eachMonth cruzam ano', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(eachMonth('2026-11', '2027-01')).toEqual(['2026-11', '2026-12', '2027-01']);
  });

  it('eachDay inclusivo e vazio quando invertido', () => {
    expect([...eachDay('2026-02-27', '2026-03-01')]).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
    ]);
    expect([...eachDay('2026-03-02', '2026-03-01')]).toEqual([]);
  });

  it('startOfWeek com domingo e segunda', () => {
    expect(startOfWeek('2026-11-18', 0)).toBe('2026-11-15');
    expect(startOfWeek('2026-11-15', 0)).toBe('2026-11-15');
    expect(startOfWeek('2026-11-15', 1)).toBe('2026-11-09');
  });
});
