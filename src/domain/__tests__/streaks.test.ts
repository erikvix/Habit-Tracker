import { maskFromWeekdays } from '../schedule';
import { computeStreaks } from '../streaks';
import { fill, history } from './helpers';

const TODAY = '2026-11-18'; // quarta

describe('computeStreaks', () => {
  it('sem commits', () => {
    expect(computeStreaks(history({ startDate: '2026-11-01' }), TODAY)).toEqual({
      current: 0,
      longest: 0,
    });
  });

  it('hoje cumprido soma na sequência atual', () => {
    const h = history({ startDate: '2026-11-01', progress: fill('2026-11-10', '2026-11-18', 1) });
    expect(computeStreaks(h, TODAY)).toEqual({ current: 9, longest: 9 });
  });

  it('hoje pendente não quebra a sequência', () => {
    const h = history({ startDate: '2026-11-01', progress: fill('2026-11-10', '2026-11-17', 1) });
    expect(computeStreaks(h, TODAY)).toEqual({ current: 8, longest: 8 });
  });

  it('ontem não cumprido zera a atual, mas a maior permanece', () => {
    const h = history({
      startDate: '2026-11-01',
      progress: { ...fill('2026-11-01', '2026-11-10', 1), ...fill('2026-11-15', '2026-11-16', 1) },
    });
    expect(computeStreaks(h, TODAY)).toEqual({ current: 0, longest: 10 });
  });

  it('dias inativos são pulados (não quebram nem somam)', () => {
    // seg–sex; cumpriu todos os dias úteis de 2026-11-02 a 2026-11-18 (13 dias úteis).
    const weekdays = Object.fromEntries(
      Object.entries(fill('2026-11-02', '2026-11-18', 1)).filter(([d]) => {
        const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
        return wd !== 0 && wd !== 6;
      }),
    );
    const h = history({
      startDate: '2026-11-01',
      schedules: [['2026-11-01', 1, maskFromWeekdays([1, 2, 3, 4, 5])]],
      progress: weekdays,
    });
    expect(computeStreaks(h, TODAY)).toEqual({ current: 13, longest: 13 });
  });

  it('commit em dia inativo não soma', () => {
    const h = history({
      startDate: '2026-11-01',
      schedules: [['2026-11-01', 1, maskFromWeekdays([1, 2, 3, 4, 5])]],
      progress: { '2026-11-14': 1, '2026-11-15': 1 }, // sábado e domingo
    });
    expect(computeStreaks(h, TODAY)).toEqual({ current: 0, longest: 0 });
  });

  it('meta aumentada: dias abaixo da nova meta quebram', () => {
    const h = history({
      goalType: 'count',
      startDate: '2026-11-01',
      schedules: [
        ['2026-11-01', 4],
        ['2026-11-11', 8],
      ],
      progress: fill('2026-11-01', '2026-11-18', 4),
    });
    expect(computeStreaks(h, TODAY)).toEqual({ current: 0, longest: 10 });
  });

  it('arquivado: congela na véspera do arquivamento', () => {
    const h = history({
      startDate: '2026-11-01',
      archivedAt: '2026-11-06',
      progress: fill('2026-11-01', '2026-11-18', 1),
    });
    expect(computeStreaks(h, TODAY)).toEqual({ current: 5, longest: 5 });
  });

  it('startDate no futuro (defensivo)', () => {
    expect(computeStreaks(history({ startDate: '2026-12-01' }), TODAY)).toEqual({
      current: 0,
      longest: 0,
    });
  });
});
