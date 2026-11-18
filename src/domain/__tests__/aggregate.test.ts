import { aggregateLevels, completedByDate } from '../aggregate';
import { maskFromWeekdays } from '../schedule';
import { sumInRange } from '../stats';
import { history } from './helpers';

const FROM = '2026-11-01';
const TO = '2026-11-18';

describe('completedByDate', () => {
  const water = history({
    goalType: 'count',
    startDate: FROM,
    schedules: [[FROM, 8]],
    progress: { '2026-11-10': 8, '2026-11-11': 5, '2026-11-12': 12 },
  });
  const reading = history({
    goalType: 'time',
    startDate: FROM,
    schedules: [[FROM, 30]],
    progress: { '2026-11-10': 30, '2026-11-11': 45 },
  });

  it('cada hábito com meta cumprida conta 1, independente do volume', () => {
    const c = completedByDate([water, reading], [], FROM, TO);
    expect(c.get('2026-11-10')).toBe(2); // 8 copos + 30 min = 2 itens, não 38
    expect(c.get('2026-11-11')).toBe(1); // água incompleta não conta
    expect(c.get('2026-11-12')).toBe(1);
  });

  it('tarefas concluídas contam 1 no dia da conclusão; pendentes não contam', () => {
    const c = completedByDate(
      [water],
      [
        { id: 't1', completedLocalDate: '2026-11-10' },
        { id: 't2', completedLocalDate: '2026-11-10' },
        { id: 't3', completedLocalDate: null },
        { id: 't4', completedLocalDate: '2026-10-31' }, // fora do período
      ],
      FROM,
      TO,
    );
    expect(c.get('2026-11-10')).toBe(3);
    expect(c.has('2026-10-31')).toBe(false);
  });

  it('dia inativo cumprido conta como item feito', () => {
    const weekdaysOnly = history({
      startDate: FROM,
      schedules: [[FROM, 1, maskFromWeekdays([1, 2, 3, 4, 5])]],
      progress: { '2026-11-14': 1 }, // sábado
    });
    expect(completedByDate([weekdaysOnly], [], FROM, TO).get('2026-11-14')).toBe(1);
  });

  it('arquivado: histórico anterior conta, a partir do arquivamento não', () => {
    const h = history({
      startDate: FROM,
      archivedAt: '2026-11-10',
      progress: { '2026-11-09': 1, '2026-11-10': 1 },
    });
    const c = completedByDate([h], [], FROM, TO);
    expect(c.get('2026-11-09')).toBe(1);
    expect(c.has('2026-11-10')).toBe(false);
  });

  it('meta vigente de cada dia', () => {
    const h = history({
      goalType: 'count',
      startDate: FROM,
      schedules: [
        [FROM, 8],
        ['2026-11-10', 4],
      ],
      progress: { '2026-11-09': 4, '2026-11-10': 4 },
    });
    const c = completedByDate([h], [], FROM, TO);
    expect(c.has('2026-11-09')).toBe(false);
    expect(c.get('2026-11-10')).toBe(1);
  });
});

describe('aggregateLevels', () => {
  it('níveis relativos ao maior dia do período', () => {
    const levels = aggregateLevels(
      new Map([
        ['2026-11-01', 1],
        ['2026-11-02', 2],
        ['2026-11-03', 3],
        ['2026-11-04', 4],
      ]),
    );
    expect([...levels.values()].map((d) => d.level)).toEqual([1, 2, 3, 4]);
  });

  it('mapa vazio', () => {
    expect(aggregateLevels(new Map()).size).toBe(0);
  });
});

describe('sumInRange', () => {
  it('soma só dentro do intervalo (inclusivo)', () => {
    const m = new Map([
      ['2026-10-31', 5],
      ['2026-11-01', 2],
      ['2026-11-18', 3],
      ['2026-11-19', 7],
    ]);
    expect(sumInRange(m, '2026-11-01', '2026-11-18')).toBe(5);
  });
});
