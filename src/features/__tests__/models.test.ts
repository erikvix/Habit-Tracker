import { history } from '@/domain/__tests__/helpers';
import { maskFromWeekdays } from '@/domain/schedule';

import { habitGraphData } from '../habit-detail/model';
import {
  changeGoalType,
  describeDays,
  describeSchedule,
  emptyHabitForm,
  toHabitInput,
  validateHabitForm,
} from '../habit-form/model';
import {
  dayProgressText,
  formatShortDate,
  monthShortLabel,
  msUntilNextRollover,
  progressLabel,
  progressRatio,
} from '../shared/model';
import { buildTodayList, todaySummary } from '../today/model';

const TODAY = '2026-11-18'; // quarta

describe('msUntilNextRollover', () => {
  it('meia-noite: até o fim do dia', () => {
    expect(msUntilNextRollover(new Date(2026, 10, 18, 23, 0), 0)).toBe(60 * 60_000);
  });
  it('virada às 4h: antes das 4 → hoje às 4; depois → amanhã às 4', () => {
    expect(msUntilNextRollover(new Date(2026, 10, 18, 3, 30), 4)).toBe(30 * 60_000);
    expect(msUntilNextRollover(new Date(2026, 10, 18, 4, 0), 4)).toBe(24 * 3_600_000);
  });
});

describe('formatação', () => {
  it('datas e meses em pt-BR', () => {
    expect(formatShortDate('2026-11-18')).toBe('qua, 18 nov');
    expect(formatShortDate('2027-01-03')).toBe('dom, 3 jan');
    expect(monthShortLabel('2026-03')).toBe('Mar');
  });

  it('progresso por tipo', () => {
    expect(progressLabel('binary', 0, 1)).toBe('Pendente');
    expect(progressLabel('binary', 1, 1)).toBe('Feito');
    expect(progressLabel('count', 3, 8)).toBe('3/8');
    expect(progressLabel('time', 15, 30)).toBe('15/30 min');
    expect(dayProgressText('count', 3, 8)).toBe('3 de 8');
    expect(dayProgressText('time', 45, 30)).toBe('45 de 30 min');
  });

  it('progressRatio limitado a 0–1', () => {
    expect(progressRatio(3, 8)).toBe(0.375);
    expect(progressRatio(12, 8)).toBe(1);
    expect(progressRatio(1, undefined)).toBe(1);
  });
});

describe('buildTodayList', () => {
  const daily = history({ name: 'Diário', startDate: '2026-11-01', progress: { [TODAY]: 1 } });
  const weekend = {
    ...history({
      name: 'Fim de semana',
      startDate: '2026-11-01',
      schedules: [['2026-11-01', 1, maskFromWeekdays([0, 6])]],
    }),
  };
  const archived = history({
    name: 'Arquivado',
    startDate: '2026-11-01',
    archivedAt: '2026-11-10',
  });

  it('separa ativos de hoje e fora de hoje; remove arquivados', () => {
    const list = buildTodayList([daily, weekend, archived], TODAY);
    expect(list.active.map((i) => i.history.habit.name)).toEqual(['Diário']);
    expect(list.other.map((i) => i.history.habit.name)).toEqual(['Fim de semana']);
  });

  it('semana com 7 dias terminando hoje e resumo', () => {
    const list = buildTodayList([daily], TODAY);
    const item = list.active[0]!;
    expect(item.week.map((d) => d.date)).toEqual([
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
    ]);
    expect(item.day).toMatchObject({ met: true, level: 4 });
    expect(todaySummary(list)).toEqual({ done: 1, total: 1 });
  });
});

describe('habitGraphData', () => {
  it('níveis, descanso e futuro', () => {
    const h = history({
      goalType: 'count',
      startDate: '2026-11-02',
      schedules: [['2026-11-02', 4, maskFromWeekdays([1, 2, 3, 4, 5])]],
      progress: { '2026-11-17': 1, '2026-11-14': 4 }, // 1/4 = 25% → nível 2
    });
    const g = habitGraphData(h, TODAY);
    const cells = new Map(g.weeks.flat().map((c) => [c.date, c]));
    expect(cells.get('2026-11-17')).toMatchObject({ level: 2, rest: false });
    expect(cells.get('2026-11-14')).toMatchObject({ level: 4, rest: false }); // sábado com commit
    expect(cells.get('2026-11-15')).toMatchObject({ level: 0, rest: true }); // domingo vazio
    expect(cells.get('2026-11-01')).toMatchObject({ level: 0, rest: false }); // antes do início
    expect(cells.get('2026-11-19')).toMatchObject({ future: true });
    expect(g.weeks.flat()).toHaveLength(53 * 7);
  });
});

describe('formulário de hábito', () => {
  it('nome obrigatório; meta só para contagem/tempo; dias específicos ≥ 1', () => {
    expect(validateHabitForm(emptyHabitForm)).toEqual({ name: 'Dê um nome ao hábito' });
    const v = { ...emptyHabitForm, name: 'Água', goalType: 'count' as const, target: 0 };
    expect(validateHabitForm(v).target).toMatch('entre 1 e 1000');
    expect(validateHabitForm({ ...v, target: 8, everyDay: false, days: [] })).toEqual({
      days: 'Escolha pelo menos um dia',
    });
    expect(validateHabitForm({ ...v, target: 8 })).toEqual({});
  });

  it('toHabitInput: binário com meta 1 e máscara correta', () => {
    expect(
      toHabitInput({
        ...emptyHabitForm,
        name: ' Ler ',
        description: ' ',
        target: 9,
        everyDay: false,
      }),
    ).toEqual({
      name: 'Ler',
      description: null,
      goalType: 'binary',
      dailyTarget: 1,
      activeDays: maskFromWeekdays([1, 2, 3, 4, 5]),
    });
  });

  it('trocar o tipo restaura a meta padrão do tipo', () => {
    expect(changeGoalType({ ...emptyHabitForm, target: 99 }, 'time').target).toBe(30);
  });

  it('descrições de agenda', () => {
    expect(describeDays(127)).toBe('todos os dias');
    expect(describeDays(maskFromWeekdays([1, 2, 3, 4, 5]))).toBe('seg a sex');
    expect(describeDays(maskFromWeekdays([0, 6]))).toBe('fins de semana');
    expect(describeDays(maskFromWeekdays([1, 3]))).toBe('seg, qua');
    expect(describeSchedule('time', 30, 127)).toBe('Tempo · 30 min/dia · todos os dias');
  });
});
