import { crossedDayStart, formatElapsed, formatMinutes, suggestedMinutes } from '../timer/model';

describe('formatElapsed', () => {
  it.each([
    [0, '0:00'],
    [5_000, '0:05'],
    [754_000, '12:34'],
    [3_735_000, '1:02:15'],
    [-1000, '0:00'],
  ])('%i ms → %s', (ms, out) => expect(formatElapsed(ms)).toBe(out));
});

describe('suggestedMinutes', () => {
  const start = new Date(2026, 10, 18, 9, 0);
  it('arredonda e limita a 1440', () => {
    expect(suggestedMinutes(start.toISOString(), new Date(2026, 10, 18, 9, 24, 40))).toBe(25);
    expect(suggestedMinutes(start.toISOString(), new Date(2026, 10, 20, 9, 0))).toBe(1440);
  });
});

describe('crossedDayStart', () => {
  it('detecta virada à meia-noite e respeita a hora de virada', () => {
    const start = new Date(2026, 10, 17, 23, 40).toISOString();
    expect(crossedDayStart(start, new Date(2026, 10, 18, 0, 20), 0)).toBe('2026-11-17');
    // Com virada às 4h, 00:20 ainda é dia 17: não atravessou.
    expect(crossedDayStart(start, new Date(2026, 10, 18, 0, 20), 4)).toBeNull();
    expect(crossedDayStart(start, new Date(2026, 10, 17, 23, 59), 0)).toBeNull();
  });
});

describe('formatMinutes', () => {
  it('min e h', () => {
    expect(formatMinutes(25)).toBe('25 min');
    expect(formatMinutes(65)).toBe('1 h 05 min');
  });
});
