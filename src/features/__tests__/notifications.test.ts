import { history } from '@/domain/__tests__/helpers';

import {
  CATEGORY,
  instantOf,
  MAX_SCHEDULED,
  parseData,
  planNotifications,
  reconcile,
  scheduledAt,
  type PlanInput,
} from '../notifications/model';

// Quarta, 18/11/2026, 10:00 (horário local).
const NOW = new Date(2026, 10, 18, 10, 0);
const TODAY = '2026-11-18';

function plan(o: Partial<PlanInput> & Pick<PlanInput, 'habits'>) {
  return planNotifications({ now: NOW, rolloverHour: 0, tasks: [], ...o });
}

const ids = (p: { id: string }[]) => p.map((x) => x.id);

describe('instantOf', () => {
  it('sem virada: mesmo dia de calendário', () => {
    expect(instantOf(TODAY, 450, 0)).toEqual(new Date(2026, 10, 18, 7, 30));
  });
  it('virada às 4h: 01:00 do dia lógico cai no dia seguinte', () => {
    expect(instantOf(TODAY, 60, 4)).toEqual(new Date(2026, 10, 19, 1, 0));
    expect(instantOf(TODAY, 240, 4)).toEqual(new Date(2026, 10, 18, 4, 0));
  });
});

describe('planNotifications — hábitos', () => {
  it('janela de 14 dias, ignora horário de hoje que já passou', () => {
    const h = history({ startDate: '2026-11-01' });
    const p = plan({ habits: [{ history: h, reminders: [450, 1200] }] });
    // hoje: só 20:00 (07:30 já passou); +13 dias × 2 horários
    expect(p).toHaveLength(1 + 13 * 2);
    expect(p[0]!.id).toBe(`habit:h:${TODAY}:1200`);
    expect(p.at(-1)!.id).toBe('habit:h:2026-12-01:1200');
    expect(p[0]!.category).toBe(CATEGORY.commit);
  });

  it('meta de hoje já batida: não lembra hoje, mas lembra amanhã', () => {
    const h = history({ startDate: '2026-11-01', progress: { [TODAY]: 1 } });
    const p = plan({ habits: [{ history: h, reminders: [1200] }], horizonDays: 2 });
    expect(ids(p)).toEqual(['habit:h:2026-11-19:1200']);
  });

  it('contagem parcial ainda lembra, com a meta no texto', () => {
    const h = history({
      goalType: 'count',
      startDate: '2026-11-01',
      schedules: [['2026-11-01', 8]],
      progress: { [TODAY]: 3 },
    });
    const [first] = plan({ habits: [{ history: h, reminders: [1200] }], horizonDays: 1 });
    expect(first!.body).toContain('8');
  });

  it('só dias ativos (seg/qua/sex)', () => {
    const mask = (1 << 1) | (1 << 3) | (1 << 5);
    const h = history({ startDate: '2026-11-01', schedules: [['2026-11-01', 1, mask]] });
    const p = plan({ habits: [{ history: h, reminders: [1200] }], horizonDays: 7 });
    // qua 18, sex 20, seg 23
    expect(p.map((x) => (x.data.kind === 'habit' ? x.data.date : ''))).toEqual([
      '2026-11-18',
      '2026-11-20',
      '2026-11-23',
    ]);
  });

  it('arquivado ou sem lembretes: nada', () => {
    const archived = history({ startDate: '2026-11-01', archivedAt: '2026-11-10' });
    const none = history({ startDate: '2026-11-01' });
    expect(
      plan({
        habits: [
          { history: archived, reminders: [1200] },
          { history: none, reminders: [] },
        ],
      }),
    ).toEqual([]);
  });

  it('não lembra antes do início do hábito', () => {
    const h = history({ startDate: '2026-11-20' });
    const p = plan({ habits: [{ history: h, reminders: [1200] }], horizonDays: 4 });
    expect(ids(p)).toEqual(['habit:h:2026-11-20:1200', 'habit:h:2026-11-21:1200']);
  });

  it('hábito de tempo não tem botão Commitar (abre o app)', () => {
    const h = history({
      goalType: 'time',
      startDate: '2026-11-01',
      schedules: [['2026-11-01', 30]],
    });
    const [first] = plan({ habits: [{ history: h, reminders: [1200] }], horizonDays: 1 });
    expect(first!.category).toBeUndefined();
  });

  it('virada às 4h: às 02:00 ainda é o dia lógico anterior', () => {
    const now = new Date(2026, 10, 19, 2, 0); // lógico = 18
    const h = history({ startDate: '2026-11-01' });
    const p = planNotifications({
      now,
      rolloverHour: 4,
      tasks: [],
      horizonDays: 1,
      habits: [{ history: h, reminders: [180, 1200] }],
    });
    // 03:00 do dia lógico 18 = 19/11 03:00 (futuro); 20:00 do dia 18 já passou
    expect(ids(p)).toEqual(['habit:h:2026-11-18:180']);
    expect(p[0]!.at).toBe(new Date(2026, 10, 19, 3, 0).getTime());
  });

  it('respeita o teto de agendamentos, mantendo os mais próximos', () => {
    const habits = Array.from({ length: 40 }, (_, i) => {
      const h = history({ startDate: '2026-11-01' });
      h.habit.id = `h${i}`;
      return { history: h, reminders: [1200] };
    });
    const p = plan({ habits });
    expect(p).toHaveLength(MAX_SCHEDULED);
    expect(p.at(-1)!.at).toBeGreaterThanOrEqual(p[0]!.at);
  });
});

describe('planNotifications — tarefas', () => {
  it('só com prazo e horário futuros', () => {
    const p = plan({
      habits: [],
      tasks: [
        { id: 'a', title: 'Pagar conta', dueDate: TODAY, dueMinute: 900 },
        { id: 'b', title: 'Passou', dueDate: TODAY, dueMinute: 540 },
        { id: 'c', title: 'Sem hora', dueDate: TODAY, dueMinute: null },
        { id: 'd', title: 'Sem prazo', dueDate: null, dueMinute: null },
      ],
    });
    expect(ids(p)).toEqual([`task:a:${TODAY}:900`]);
    expect(p[0]!.body).toBe('Prazo às 15:00.');
    expect(p[0]!.category).toBe(CATEGORY.task);
  });
});

describe('reconcile', () => {
  const h = history({ startDate: '2026-11-01' });
  const planned = plan({ habits: [{ history: h, reminders: [1200] }], horizonDays: 2 });
  const [a, b] = planned as [(typeof planned)[0], (typeof planned)[0]];

  it('agenda o que falta e cancela o que sobrou; ignora ids de terceiros', () => {
    const r = reconcile(planned, [
      { id: a.id, sig: a.data.sig },
      { id: 'habit:h:2026-11-01:1200', sig: 'x' },
      { id: 'outra-coisa' },
    ]);
    expect(r.cancel).toEqual(['habit:h:2026-11-01:1200']);
    expect(ids(r.schedule)).toEqual([b.id]);
  });

  it('conteúdo mudou (ex.: renomeou): cancela e reagenda', () => {
    const r = reconcile(planned, [
      { id: a.id, sig: 'nome antigo|...' },
      { id: b.id, sig: b.data.sig },
    ]);
    expect(r.cancel).toEqual([a.id]);
    expect(ids(r.schedule)).toEqual([a.id]);
  });

  it('tudo certo: nada a fazer', () => {
    const r = reconcile(
      planned,
      planned.map((p) => ({ id: p.id, sig: p.data.sig })),
    );
    expect(r).toEqual({ cancel: [], schedule: [] });
  });
});

describe('parseData', () => {
  it('aceita só payloads do app', () => {
    expect(parseData({ kind: 'habit', habitId: 'h', date: TODAY, sig: 's' })).toEqual({
      kind: 'habit',
      habitId: 'h',
      date: TODAY,
      sig: 's',
    });
    expect(parseData({ kind: 'task', taskId: 't' })).toMatchObject({ kind: 'task', taskId: 't' });
    expect(parseData({ kind: 'habit' })).toBeNull();
    expect(parseData(null)).toBeNull();
  });
});

describe('scheduledAt', () => {
  it('lê o disparo do id, respeitando a virada', () => {
    expect(scheduledAt('habit:abc:2026-11-19:970', 0)).toBe(
      new Date(2026, 10, 19, 16, 10).getTime(),
    );
    expect(scheduledAt('task:t-1:2026-11-19:60', 4)).toBe(new Date(2026, 10, 20, 1, 0).getTime());
  });
  it('ids de fora (teste, terceiros) dão null', () => {
    expect(scheduledAt('test:123', 0)).toBeNull();
    expect(scheduledAt('outra-coisa', 0)).toBeNull();
  });
});
