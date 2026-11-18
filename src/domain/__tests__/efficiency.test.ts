import { efficiencyPercent, efficiencySeries, monthEfficiency } from '../efficiency';
import { maskFromWeekdays } from '../schedule';
import { fill, history } from './helpers';

const TODAY = '2026-11-18'; // quarta

describe('monthEfficiency', () => {
  it('mês fechado, todos os dias ativos', () => {
    const h = history({ startDate: '2026-01-01', progress: fill('2026-10-01', '2026-10-15', 1) });
    expect(monthEfficiency(h, '2026-10', TODAY)).toEqual({
      month: '2026-10',
      activeDays: 31,
      metDays: 15,
      efficiency: 15 / 31,
    });
  });

  it('dias inativos ficam fora do denominador, mesmo com commit', () => {
    // seg–sex; outubro/2026 tem 22 dias úteis. Commit em todos os 31 dias.
    const h = history({
      startDate: '2026-01-01',
      schedules: [['2026-01-01', 1, maskFromWeekdays([1, 2, 3, 4, 5])]],
      progress: fill('2026-10-01', '2026-10-31', 1),
    });
    const e = monthEfficiency(h, '2026-10', TODAY);
    expect(e.activeDays).toBe(22);
    expect(e.metDays).toBe(22);
    expect(e.efficiency).toBe(1);
  });

  it('mês corrente: hoje não cumprido não entra (pendente)', () => {
    const h = history({ startDate: '2026-01-01', progress: fill('2026-11-01', '2026-11-17', 1) });
    const e = monthEfficiency(h, '2026-11', TODAY);
    expect(e).toMatchObject({ activeDays: 17, metDays: 17, efficiency: 1 });
  });

  it('mês corrente: hoje cumprido entra', () => {
    const h = history({ startDate: '2026-01-01', progress: fill('2026-11-01', '2026-11-18', 1) });
    expect(monthEfficiency(h, '2026-11', TODAY)).toMatchObject({ activeDays: 18, metDays: 18 });
  });

  it('hábito criado no meio do mês conta a partir do startDate', () => {
    const h = history({ startDate: '2026-10-20', progress: fill('2026-10-20', '2026-10-25', 1) });
    expect(monthEfficiency(h, '2026-10', TODAY)).toMatchObject({ activeDays: 12, metDays: 6 });
  });

  it('meta trocada no meio do mês: cada dia julgado pela meta vigente', () => {
    // Setembro/2026 — 1–14: meta 8; 15–30: meta 4. Fez 4 em todos os dias.
    const h = history({
      goalType: 'count',
      startDate: '2026-09-01',
      schedules: [
        ['2026-09-01', 8],
        ['2026-09-15', 4],
      ],
      progress: fill('2026-09-01', '2026-09-30', 4),
    });
    expect(monthEfficiency(h, '2026-09', TODAY)).toMatchObject({
      activeDays: 30,
      metDays: 16, // só 15..30
    });
  });

  it('arquivado: conta até a véspera do arquivamento', () => {
    const h = history({
      startDate: '2026-01-01',
      archivedAt: '2026-10-11',
      progress: fill('2026-10-01', '2026-10-31', 1),
    });
    expect(monthEfficiency(h, '2026-10', TODAY)).toMatchObject({ activeDays: 10, metDays: 10 });
  });

  it('sem dia ativo → efficiency null (não 0%)', () => {
    const h = history({ startDate: '2026-11-18' });
    expect(monthEfficiency(h, '2026-10', TODAY).efficiency).toBeNull(); // antes do início
    expect(monthEfficiency(h, '2026-12', TODAY).efficiency).toBeNull(); // futuro
    expect(monthEfficiency(h, '2026-11', TODAY).efficiency).toBeNull(); // só hoje, pendente
  });

  it('nenhum commit em mês ativo → 0', () => {
    const h = history({ startDate: '2026-01-01' });
    expect(monthEfficiency(h, '2026-10', TODAY).efficiency).toBe(0);
  });
});

describe('efficiencySeries', () => {
  it('um ponto por mês, inclusive nas pontas', () => {
    const h = history({ startDate: '2026-09-01', progress: fill('2026-09-01', '2026-11-18', 1) });
    const s = efficiencySeries(h, '2026-08', '2026-11', TODAY);
    expect(s.map((m) => m.month)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
    expect(s.map((m) => m.efficiency)).toEqual([null, 1, 1, 1]);
  });

  it('efficiencyPercent arredonda', () => {
    expect(efficiencyPercent(15 / 31)).toBe(48);
    expect(efficiencyPercent(null)).toBeNull();
  });
});
