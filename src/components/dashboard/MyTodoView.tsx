'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ListTodo, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { filterPersonalTodos, type PersonalTodo, type PersonalTodoFilter } from '@/lib/personal-todos';

const FILTERS: { id: PersonalTodoFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

async function responseError(response: Response, fallback: string): Promise<Error> {
  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  return new Error(payload?.error?.message || fallback);
}

export function MyTodoView() {
  const [todos, setTodos] = useState<PersonalTodo[]>([]);
  const [filter, setFilter] = useState<PersonalTodoFilter>('all');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadTodos() {
      try {
        const response = await fetch('/api/me/todos', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw await responseError(response, 'Could not load your tasks.');
        const payload = await response.json() as { todos: PersonalTodo[] };
        setTodos(payload.todos);
        setError(null);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'Could not load your tasks.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadTodos();
    return () => controller.abort();
  }, [retryCount]);

  const completedCount = useMemo(() => todos.filter(todo => todo.isCompleted).length, [todos]);
  const visibleTodos = useMemo(() => filterPersonalTodos(todos, filter), [todos, filter]);

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setValidationError('Enter a task before adding it.');
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    setError(null);
    setValidationError(null);
    try {
      const response = await fetch('/api/me/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: normalizedTitle }),
      });
      if (!response.ok) throw await responseError(response, 'Could not save your task.');
      const payload = await response.json() as { todo: PersonalTodo };
      setTodos(current => [payload.todo, ...current]);
      setTitle('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your task.');
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  async function setCompletion(todo: PersonalTodo, isCompleted: boolean) {
    setBusyIds(current => new Set(current).add(todo.id));
    setError(null);
    try {
      const response = await fetch(`/api/me/todos/${encodeURIComponent(todo.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted }),
      });
      if (!response.ok) throw await responseError(response, 'Could not update your task.');
      const payload = await response.json() as { todo: PersonalTodo };
      setTodos(current => current.map(item => item.id === todo.id ? payload.todo : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update your task.');
    } finally {
      setBusyIds(current => {
        const next = new Set(current);
        next.delete(todo.id);
        return next;
      });
    }
  }

  async function removeTask(todo: PersonalTodo) {
    setBusyIds(current => new Set(current).add(todo.id));
    setError(null);
    try {
      const response = await fetch(`/api/me/todos/${encodeURIComponent(todo.id)}`, { method: 'DELETE' });
      if (!response.ok) throw await responseError(response, 'Could not delete your task.');
      setTodos(current => current.filter(item => item.id !== todo.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete your task.');
    } finally {
      setBusyIds(current => {
        const next = new Set(current);
        next.delete(todo.id);
        return next;
      });
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6" aria-labelledby="my-todo-heading">
      <header>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--action-primary-fill)] text-[var(--action-primary-foreground)]">
            <ListTodo className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 id="my-todo-heading" className="text-2xl font-bold text-[var(--text-primary)]">My To-Do</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Keep track of what you need to get done.</p>
          </div>
        </div>
      </header>

      <form onSubmit={addTask} className="flex flex-col gap-3 rounded-2xl border border-[var(--divider)] bg-[var(--surface-card)] p-4 sm:flex-row sm:items-start">
        <Input
          label="Add a task"
          value={title}
          onChange={event => { setTitle(event.target.value); setValidationError(null); }}
          placeholder="What do you need to do?"
          maxLength={240}
          error={validationError ?? undefined}
          disabled={saving}
          autoComplete="off"
        />
        <Button type="submit" loading={saving} disabled={saving} className="min-h-10 shrink-0 sm:mt-6">
          <Plus className="h-4 w-4" aria-hidden="true" />Add Task
        </Button>
      </form>

      {error && <p className="rounded-lg border border-[var(--danger)]/40 bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger)]" role="alert">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-[var(--text-secondary)]" aria-live="polite">
          {completedCount} of {todos.length} completed
        </p>
        <div className="flex w-fit rounded-full border border-[var(--divider)] bg-[var(--surface-card)] p-1" role="group" aria-label="Filter tasks">
          {FILTERS.map(item => <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={`min-h-9 rounded-full px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${filter === item.id ? 'bg-[var(--action-primary-fill)] text-[var(--action-primary-foreground)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'}`}
          >{item.label}</button>)}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--divider)] bg-[var(--surface-card)]">
        {loading ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-[var(--text-secondary)]" role="status"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />Loading your tasks…</div>
          : error && todos.length === 0 ? <div className="px-5 py-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">Your tasks could not be loaded</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Check your connection and try again.</p>
            <Button type="button" variant="secondary" onClick={() => setRetryCount(count => count + 1)} className="mt-4">Try again</Button>
          </div>
          : visibleTodos.length === 0 ? <div className="px-5 py-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--surface-elevated)] text-[var(--text-secondary)]"><Check className="h-5 w-5" aria-hidden="true" /></span>
            <p className="mt-3 font-medium text-[var(--text-primary)]">{todos.length === 0 ? 'Your list is clear' : `No ${filter} tasks`}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{todos.length === 0 ? 'Add a task above to get started.' : 'Choose another filter to see more tasks.'}</p>
          </div> : <ul className="divide-y divide-[var(--divider)]">
            {visibleTodos.map(todo => {
              const busy = busyIds.has(todo.id);
              return <li key={todo.id} className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-5">
                <input
                  type="checkbox"
                  checked={todo.isCompleted}
                  disabled={busy}
                  onChange={event => void setCompletion(todo, event.target.checked)}
                  aria-label={`${todo.isCompleted ? 'Reopen' : 'Complete'} ${todo.title}`}
                  className="h-5 w-5 shrink-0 cursor-pointer rounded border-[var(--border)] accent-[var(--action-primary-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-wait"
                />
                <span className={`min-w-0 flex-1 break-words text-sm ${todo.isCompleted ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>{todo.title}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeTask(todo)}
                  aria-label={`Delete ${todo.title}`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--danger-surface)] hover:text-[var(--danger)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-wait disabled:opacity-50"
                ><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
              </li>;
            })}
          </ul>}
      </div>
    </section>
  );
}
