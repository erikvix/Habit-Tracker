import { fireEvent, render, screen } from '@testing-library/react-native';

import { maskFromWeekdays } from '@/domain/schedule';
import { AppThemeProvider } from '@/ui/theme/ThemeProvider';

import { canEditDay, commitValueLabel, formatCommitTime, sourceLabel } from '../habit-day/model';
import { SCHEDULE_NOTICE } from '../habit-form/HabitEditScreen';
import { HabitForm } from '../habit-form/HabitForm';
import { habitToForm } from '../habit-form/model';
import { splitArchived } from '../habits/model';

const TODAY = '2026-11-18';

describe('canEditDay', () => {
  it('permite hoje e passado; bloqueia futuro e arquivado', () => {
    expect(canEditDay({ archivedAt: null }, TODAY, TODAY)).toEqual({ ok: true });
    expect(canEditDay({ archivedAt: null }, '2025-01-01', TODAY)).toEqual({ ok: true });
    expect(canEditDay({ archivedAt: null }, '2026-11-19', TODAY)).toMatchObject({ ok: false });
    expect(canEditDay({ archivedAt: '2026-11-10' }, '2026-11-01', TODAY)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('arquivado'),
    });
  });
});

describe('rótulos de commit', () => {
  it('origem, hora local e valor', () => {
    expect(sourceLabel('timer')).toBe('cronômetro');
    expect(sourceLabel('edit')).toBe('edição');
    expect(formatCommitTime(new Date(2026, 10, 18, 7, 5).toISOString())).toBe('07:05');
    expect(commitValueLabel('time', { value: 25 })).toBe('25 min');
    expect(commitValueLabel('count', { value: 1 })).toBe('+1');
  });
});

describe('habitToForm', () => {
  it('preenche com a versão vigente', () => {
    expect(
      habitToForm(
        { name: 'Água', description: null, goalType: 'count' },
        { dailyTarget: 8, activeDays: 127 },
      ),
    ).toEqual({
      name: 'Água',
      description: '',
      goalType: 'count',
      target: 8,
      everyDay: true,
      days: [1, 2, 3, 4, 5],
      reminders: [],
    });
  });

  it('lembretes vêm ordenados e sem repetição', () => {
    const f = habitToForm({ name: 'x', goalType: 'binary' }, undefined, [1200, 450, 450]);
    expect(f.reminders).toEqual([450, 1200]);
  });

  it('dias específicos viram lista de dias', () => {
    const f = habitToForm(
      { name: 'x', goalType: 'binary' },
      { dailyTarget: 1, activeDays: maskFromWeekdays([2, 4]) },
    );
    expect(f).toMatchObject({ everyDay: false, days: [2, 4] });
  });
});

describe('splitArchived', () => {
  it('separa mantendo a ordem', () => {
    const items = [
      { habit: { id: 'a', archivedAt: null } },
      { habit: { id: 'b', archivedAt: '2026-11-01' } },
      { habit: { id: 'c' } },
    ];
    const r = splitArchived(items);
    expect(r.active.map((i) => i.habit.id)).toEqual(['a', 'c']);
    expect(r.archived.map((i) => i.habit.id)).toEqual(['b']);
  });
});

describe('HabitForm em modo edição', () => {
  it('trava o tipo, mostra o aviso de vigência e envia as alterações', async () => {
    const onSubmit = jest.fn();
    await render(
      <AppThemeProvider>
        <HabitForm
          initial={habitToForm(
            { name: 'Água', goalType: 'count' },
            { dailyTarget: 8, activeDays: 127 },
          )}
          lockGoalType
          notice={SCHEDULE_NOTICE}
          submitLabel="Salvar alterações"
          onSubmit={onSubmit}
        />
      </AppThemeProvider>,
    );
    // Sem seletor de tipo: só o rótulo e a explicação.
    expect(screen.queryByText('Sim/não')).toBeNull();
    expect(screen.getByText('Contagem')).toBeTruthy();
    expect(screen.getByText(/não pode ser alterado/)).toBeTruthy();
    expect(screen.getByText(SCHEDULE_NOTICE)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Diminuir meta diária'));
    await fireEvent.press(screen.getByText('Salvar alterações'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Água', goalType: 'count', target: 7 }),
    );
  });
});
