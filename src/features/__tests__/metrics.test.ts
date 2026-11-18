import { history } from '@/domain/__tests__/helpers';
import { maskFromWeekdays } from '@/domain/schedule';

import {
  minSelectableMonth,
  efficiencyLevel,
  habitStats,
  overviewData,
  overviewDayText,
  rankingFor,
} from '../metrics/model';
import { monthLongLabel } from '../shared/model';

const TODAY = '2026-11-18'; // quarta

describe('efficiencyLevel', () => {
  it.each([
    [null, 0],
    [0, 0],
    [0.1, 1],
    [0.25, 2],
    [0.49, 2],
    [0.5, 3],
    [0.99, 3],
    [1, 4],
  ])('%p → %i', (e, level) => expect(efficiencyLevel(e)).toBe(level));
});

describe('habitStats', () => {
  it('sequências, eficiência do mês com meta trocada e minutos', () => {
    const h = history({
      goalType: 'time',
      startDate: '2026-11-01',
      schedules: [
        ['2026-11-01', 60],
        ['2026-11-10', 30],
      ],
      // 01–09: 30 min (abaixo da meta de 60); 10–17: 30 min (cumpre a de 30).
      progress: Object.fromEntries(
        Array.from({ length: 17 }, (_, i) => [`2026-11-${String(i + 1).padStart(2, '0')}`, 30]),
      ),
    });
    const s = habitStats(h, TODAY, '2026-11', '2026-01-01');
    expect(s.streaks).toEqual({ current: 8, longest: 8 });
    expect(s.month).toMatchObject({ activeDays: 17, metDays: 8 });
    expect(s.minutes).toBe(17 * 30);
  });

  it('série de 12 meses atravessa a virada do ano; antes do início é null', () => {
    const h = history({ startDate: '2026-10-01', progress: { '2026-10-05': 1 } });
    const s = habitStats(h, '2027-02-10', '2027-02', '2026-02-10');
    expect(s.series).toHaveLength(12);
    expect(s.series[0]!.month).toBe('2026-03');
    expect(s.series.at(-1)!.month).toBe('2027-02');
    expect(s.series.find((m) => m.month === '2026-09')!.efficiency).toBeNull();
    expect(s.series.find((m) => m.month === '2026-10')!.metDays).toBe(1);
  });

  it('mês sem dias ativos → efficiency null', () => {
    const h = history({
      startDate: '2026-11-01',
      schedules: [['2026-11-01', 1, maskFromWeekdays([0])]], // só domingo
    });
    // Novembro até dia 18 tem domingos; mês futuro não.
    expect(habitStats(h, TODAY, '2026-12', '2026-01-01').month.efficiency).toBeNull();
  });
});

describe('overviewData', () => {
  it('soma hábitos cumpridos e tarefas, com detalhamento por dia', () => {
    const a = history({ name: 'A', startDate: '2026-11-01', progress: { [TODAY]: 1 } });
    const b = history({
      name: 'B',
      goalType: 'count',
      startDate: '2026-11-01',
      schedules: [['2026-11-01', 4]],
      progress: { [TODAY]: 2, '2026-11-17': 4 }, // hoje incompleto
    });
    const o = overviewData(
      [a, b],
      [
        { id: 't1', completedLocalDate: TODAY },
        { id: 't2', completedLocalDate: null },
      ],
      TODAY,
    );
    expect(o.breakdown.get(TODAY)).toEqual({ habits: 1, tasks: 1 });
    expect(o.breakdown.get('2026-11-17')).toEqual({ habits: 1, tasks: 0 });
    expect(o.total).toBe(3);
    const cells = new Map(o.weeks.flat().map((c) => [c.date, c]));
    expect(cells.get(TODAY)!.level).toBe(4); // maior dia do período
    expect(cells.get('2026-11-17')!.level).toBe(2); // 1 de máx 2 → 50%
    expect(cells.get('2026-11-19')!.future).toBe(true);
  });

  it('texto do dia', () => {
    expect(overviewDayText(undefined)).toBe('nada concluído');
    expect(overviewDayText({ habits: 2, tasks: 1 })).toBe('3 itens (2 hábitos, 1 tarefa)');
    expect(overviewDayText({ habits: 0, tasks: 1 })).toBe('1 item (1 tarefa)');
  });
});

describe('rankingFor / minSelectableMonth', () => {
  it('ignora arquivados e ordena por eficiência', () => {
    const good = history({ name: 'Bom', startDate: '2026-11-01' });
    good.progress = new Map(
      Array.from({ length: 17 }, (_, i) => [`2026-11-${String(i + 1).padStart(2, '0')}`, 1]),
    );
    const bad = history({ name: 'Ruim', startDate: '2026-11-01', progress: { '2026-11-02': 1 } });
    const archived = history({ name: 'Arq', startDate: '2026-11-01', archivedAt: '2026-11-10' });
    const r = rankingFor([bad, archived, good], '2026-11', TODAY);
    expect(r.map((x) => x.name)).toEqual(['Bom', 'Ruim']);
    expect(r[0]!.month.efficiency).toBe(1);
  });

  it('seletor de mês: janela de 12 meses, independente do início dos hábitos', () => {
    expect(minSelectableMonth(TODAY)).toBe('2025-12');
    expect(minSelectableMonth('2027-01-05')).toBe('2026-02');
  });

  it('monthLongLabel', () => {
    expect(monthLongLabel('2026-03')).toBe('Março 2026');
  });
});
