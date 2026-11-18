import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import type { TaskRecord } from '@/data/repositories/taskRepo';
import { SectionTitle } from '@/ui/components/Counter';
import { AppThemeProvider } from '@/ui/theme/ThemeProvider';

import {
  completedLabel,
  dueLabel,
  emptyTaskForm,
  formatMinute,
  groupOpenTasks,
  pastDueToKeep,
  resolveDueDate,
  taskToForm,
  toTaskInput,
  validateTaskForm,
} from '../tasks/model';
import { QuickAddTask } from '../tasks/QuickAddTask';
import { TaskForm } from '../tasks/TaskForm';
import { TaskRow } from '../tasks/TaskRow';

const TODAY = '2026-11-30'; // segunda, último dia do mês

const task = (p: Partial<TaskRecord> & { id: string }): TaskRecord => ({
  title: p.id,
  notes: null,
  dueDate: null,
  dueMinute: null,
  completedAt: null,
  completedLocalDate: null,
  sortOrder: 0,
  ...p,
});

const renderThemed = (ui: ReactElement) => render(<AppThemeProvider>{ui}</AppThemeProvider>);

describe('modelo de tarefas', () => {
  it('agrupa por prazo, inclusive na virada do mês', () => {
    const g = groupOpenTasks(
      [
        task({ id: 'late', dueDate: '2026-11-29' }),
        task({ id: 'today', dueDate: TODAY }),
        task({ id: 'next', dueDate: '2026-12-01' }),
        task({ id: 'free' }),
        task({ id: 'done', dueDate: TODAY, completedAt: 'x' }),
      ],
      TODAY,
    );
    expect({
      overdue: g.overdue.map((t) => t.id),
      today: g.today.map((t) => t.id),
      upcoming: g.upcoming.map((t) => t.id),
      noDate: g.noDate.map((t) => t.id),
    }).toEqual({ overdue: ['late'], today: ['today'], upcoming: ['next'], noDate: ['free'] });
  });

  it('formatMinute', () => {
    expect(formatMinute(0)).toBe('00:00');
    expect(formatMinute(600)).toBe('10:00');
    expect(formatMinute(1439)).toBe('23:59');
  });

  it('rótulos de prazo', () => {
    expect(dueLabel({ dueDate: null, dueMinute: null }, TODAY)).toBeNull();
    expect(dueLabel({ dueDate: '2026-11-10', dueMinute: null }, TODAY)).toEqual({
      text: 'Atrasada · 10 nov',
      tone: 'danger',
    });
    expect(dueLabel({ dueDate: TODAY, dueMinute: 600 }, TODAY)?.text).toBe('Hoje · 10:00');
    expect(dueLabel({ dueDate: '2026-12-01', dueMinute: null }, TODAY)?.text).toBe('Amanhã');
    expect(dueLabel({ dueDate: '2026-12-04', dueMinute: null }, TODAY)?.text).toBe('sex, 4 dez');
  });

  it('rótulos de conclusão', () => {
    expect(completedLabel(TODAY, TODAY)).toBe('Concluída hoje');
    expect(completedLabel('2026-11-29', TODAY)).toBe('Concluída ontem');
    expect(completedLabel('2026-11-18', TODAY)).toBe('Concluída qua, 18 nov');
  });

  it('prazo no passado: recusado na criação; o prazo original da tarefa atrasada é preservado', () => {
    const past = { ...emptyTaskForm, title: 'x', due: 'custom' as const, customDate: '2026-11-20' };
    expect(validateTaskForm(past, TODAY)).toEqual({ due: 'O prazo não pode ser no passado' });
    // Edição de tarefa já atrasada: mantém a data original…
    const keep = pastDueToKeep(past, TODAY);
    expect(keep).toBe('2026-11-20');
    expect(validateTaskForm(past, TODAY, keep)).toEqual({});
    // …mas não aceita outra data passada.
    expect(validateTaskForm({ ...past, customDate: '2026-11-25' }, TODAY, keep)).toEqual({
      due: 'O prazo não pode ser no passado',
    });
    expect(validateTaskForm({ ...past, customDate: TODAY }, TODAY)).toEqual({});
    expect(pastDueToKeep({ ...past, customDate: '2026-12-02' }, TODAY)).toBeNull();
  });

  it('formulário: validação, prazo e horário', () => {
    expect(validateTaskForm(emptyTaskForm, TODAY)).toEqual({ title: 'Dê um título à tarefa' });
    expect(validateTaskForm({ ...emptyTaskForm, title: 'x', due: 'custom' }, TODAY)).toEqual({
      due: 'Escolha uma data',
    });
    expect(resolveDueDate({ ...emptyTaskForm, due: 'tomorrow' }, TODAY)).toBe('2026-12-01');
    // Sem prazo descarta o horário.
    expect(toTaskInput({ ...emptyTaskForm, title: ' a ', dueMinute: 600 }, TODAY)).toEqual({
      title: 'a',
      notes: null,
      dueDate: null,
      dueMinute: null,
    });
    expect(
      toTaskInput({ ...emptyTaskForm, title: 'a', due: 'today', dueMinute: 600 }, TODAY),
    ).toMatchObject({ dueDate: TODAY, dueMinute: 600 });
  });

  it('taskToForm reconhece hoje/amanhã/data', () => {
    expect(taskToForm(task({ id: 'a', dueDate: TODAY }), TODAY).due).toBe('today');
    expect(taskToForm(task({ id: 'a', dueDate: '2026-12-01' }), TODAY).due).toBe('tomorrow');
    expect(taskToForm(task({ id: 'a', dueDate: '2026-12-25' }), TODAY)).toMatchObject({
      due: 'custom',
      customDate: '2026-12-25',
    });
    expect(taskToForm(task({ id: 'a' }), TODAY).due).toBe('none');
  });
});

describe('TaskRow', () => {
  it('só há duas ações: editar (linha) e concluir (botão à direita); o ícone não é tocável', async () => {
    await renderThemed(
      <TaskRow task={task({ id: 'Boleto' })} today={TODAY} onToggle={() => {}} onOpen={() => {}} />,
    );
    expect(screen.getAllByRole('button').map((b) => b.props.accessibilityLabel)).toEqual([
      'Editar Boleto',
      'Concluir Boleto',
    ]);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('tocar no status alterna; tocar no título abre', async () => {
    const onToggle = jest.fn();
    const onOpen = jest.fn();
    await renderThemed(
      <TaskRow
        task={task({ id: 'Boleto', dueDate: '2026-11-10' })}
        today={TODAY}
        onToggle={onToggle}
        onOpen={onOpen}
      />,
    );
    expect(screen.getByText('Atrasada · 10 nov')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Concluir Boleto'));
    await fireEvent.press(screen.getByLabelText('Editar Boleto'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('concluída mostra a data e oferece reabrir', async () => {
    await renderThemed(
      <TaskRow
        task={task({ id: 'Boleto', completedAt: 'x', completedLocalDate: TODAY })}
        today={TODAY}
        onToggle={() => {}}
        onOpen={() => {}}
      />,
    );
    expect(screen.getByText('Concluída hoje')).toBeTruthy();
    expect(screen.getByLabelText('Reabrir Boleto')).toBeTruthy();
  });
});

describe('SectionTitle', () => {
  it('mostra o título e a contagem na pílula', async () => {
    await renderThemed(<SectionTitle title="Hoje" count={2} />);
    expect(screen.getByRole('header').props.children).toBe('Hoje');
    expect(screen.getByLabelText('2 itens')).toBeTruthy();
  });
});

describe('QuickAddTask', () => {
  it('cria com o título aparado e limpa o campo; ignora vazio', async () => {
    const onAdd = jest.fn();
    await renderThemed(<QuickAddTask onAdd={onAdd} />);
    const input = screen.getByLabelText('Nova tarefa');
    await fireEvent(input, 'submitEditing');
    expect(onAdd).not.toHaveBeenCalled();
    await fireEvent.changeText(input, '  Ligar pro banco ');
    await fireEvent(input, 'submitEditing');
    expect(onAdd).toHaveBeenCalledWith('Ligar pro banco');
    expect(screen.getByLabelText('Nova tarefa').props.value).toBe('');
  });
});

describe('TaskForm', () => {
  it('bloqueia título vazio; horário só aparece com prazo', async () => {
    const onSubmit = jest.fn();
    await renderThemed(<TaskForm today={TODAY} submitLabel="Criar tarefa" onSubmit={onSubmit} />);
    expect(screen.queryByText('Adicionar horário')).toBeNull();
    await fireEvent.press(screen.getByText('Criar tarefa'));
    expect(screen.getByText('Dê um título à tarefa')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Hoje'));
    expect(screen.getByText('Adicionar horário')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Mercado');
    await fireEvent.press(screen.getByText('Criar tarefa'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Mercado', due: 'today', dueMinute: null }),
    );
  });

  it('edição mostra excluir e concluir/reabrir', async () => {
    const onDelete = jest.fn();
    const onToggle = jest.fn();
    await renderThemed(
      <TaskForm
        today={TODAY}
        submitLabel="Salvar"
        onSubmit={() => {}}
        onDelete={onDelete}
        completion={{ done: false, onToggle }}
      />,
    );
    await fireEvent.press(screen.getByText('Excluir tarefa'));
    await fireEvent.press(screen.getByText('Marcar como concluída'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('tarefa concluída oferece reabrir', async () => {
    await renderThemed(
      <TaskForm
        today={TODAY}
        submitLabel="Salvar"
        onSubmit={() => {}}
        completion={{ done: true, onToggle: () => {} }}
      />,
    );
    expect(screen.getByText('Reabrir tarefa')).toBeTruthy();
  });
});
