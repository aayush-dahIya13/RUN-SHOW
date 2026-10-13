import { randomUUID } from 'node:crypto';
import type { SqliteDatabase } from './db';
import type { PersonalTodo } from '../personal-todos';

export class PersonalTodoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PersonalTodoValidationError';
  }
}

function fromRow(row: Record<string, unknown>): PersonalTodo {
  return {
    id: String(row.id),
    title: String(row.title),
    isCompleted: Number(row.is_completed) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    completedAt: row.completed_at == null ? null : String(row.completed_at),
  };
}

export function listPersonalTodos(database: SqliteDatabase, userId: string): PersonalTodo[] {
  return database.prepare(`
    SELECT id, title, is_completed, created_at, updated_at, completed_at
    FROM personal_todos
    WHERE user_id = ?
    ORDER BY is_completed ASC, created_at DESC, id ASC
  `).all(userId).map(fromRow);
}

export function createPersonalTodo(database: SqliteDatabase, userId: string, rawTitle: unknown): PersonalTodo {
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
  if (!title) throw new PersonalTodoValidationError('Enter a task before adding it.');
  if (title.length > 240) throw new PersonalTodoValidationError('Tasks must be 240 characters or fewer.');

  const timestamp = new Date().toISOString();
  const todoId = `todo_${randomUUID()}`;
  database.prepare(`
    INSERT INTO personal_todos (id, user_id, title, is_completed, created_at, updated_at, completed_at)
    VALUES (?, ?, ?, 0, ?, ?, NULL)
  `).run(todoId, userId, title, timestamp, timestamp);
  const row = database.prepare(`
    SELECT id, title, is_completed, created_at, updated_at, completed_at
    FROM personal_todos WHERE id = ? AND user_id = ?
  `).get(todoId, userId);
  if (!row) throw new Error('The saved task could not be loaded.');
  return fromRow(row);
}

export function setPersonalTodoCompletion(
  database: SqliteDatabase,
  userId: string,
  todoId: string,
  isCompleted: boolean,
): PersonalTodo | null {
  const timestamp = new Date().toISOString();
  const result = database.prepare(`
    UPDATE personal_todos
    SET is_completed = ?, updated_at = ?, completed_at = ?
    WHERE id = ? AND user_id = ?
  `).run(isCompleted ? 1 : 0, timestamp, isCompleted ? timestamp : null, todoId, userId);
  if (result.changes === 0) return null;
  const row = database.prepare(`
    SELECT id, title, is_completed, created_at, updated_at, completed_at
    FROM personal_todos WHERE id = ? AND user_id = ?
  `).get(todoId, userId);
  return row ? fromRow(row) : null;
}

export function deletePersonalTodo(database: SqliteDatabase, userId: string, todoId: string): boolean {
  return database.prepare('DELETE FROM personal_todos WHERE id = ? AND user_id = ?').run(todoId, userId).changes === 1;
}
