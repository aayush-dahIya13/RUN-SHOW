import { NextResponse } from 'next/server';
import { currentUser, type ServerUser } from './auth';
import { db, type SqliteDatabase } from './db';
import {
  createPersonalTodo,
  deletePersonalTodo,
  listPersonalTodos,
  PersonalTodoValidationError,
  setPersonalTodoCompletion,
} from './personal-todo-repository';
import { jsonError, validOrigin } from './http';
import { personalTodoAccess } from '../personal-todos';

interface Dependencies {
  getCurrentUser: () => Promise<ServerUser | null>;
  getDatabase: () => SqliteDatabase;
}

const defaultDependencies: Dependencies = { getCurrentUser: currentUser, getDatabase: db };

function failedToAuthenticate() {
  return jsonError('Unable to verify your session. Please sign in again.', 500, 'SESSION_CHECK_FAILED');
}

export function createPersonalTodoCollectionHandlers(dependencies = defaultDependencies) {
  async function organizer() {
    try {
      const user = await dependencies.getCurrentUser();
      const access = personalTodoAccess(user);
      if (access === 'unauthenticated') return { user: null, response: jsonError('Authentication required.', 401, 'UNAUTHENTICATED') };
      if (access === 'forbidden') return { user: null, response: jsonError('You do not have permission to perform this action.', 403, 'FORBIDDEN') };
      return { user, response: null };
    } catch {
      return { user: null, response: failedToAuthenticate() };
    }
  }

  return {
    GET: async () => {
      const auth = await organizer();
      if (auth.response) return auth.response;
      try {
        return NextResponse.json({ todos: listPersonalTodos(dependencies.getDatabase(), auth.user!.id) });
      } catch {
        return jsonError('Could not load your personal tasks.', 500, 'TODO_LOAD_FAILED');
      }
    },
    POST: async (request: Request) => {
      if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');
      const auth = await organizer();
      if (auth.response) return auth.response;
      const body = await request.json().catch(() => null) as { title?: unknown } | null;
      try {
        const todo = createPersonalTodo(dependencies.getDatabase(), auth.user!.id, body?.title);
        return NextResponse.json({ todo }, { status: 201 });
      } catch (error) {
        if (error instanceof PersonalTodoValidationError) return jsonError(error.message, 422, 'INVALID_TODO');
        return jsonError('Could not save your task. Please try again.', 500, 'TODO_SAVE_FAILED');
      }
    },
  };
}

export function createPersonalTodoItemHandlers(dependencies = defaultDependencies) {
  async function organizer() {
    try {
      const user = await dependencies.getCurrentUser();
      const access = personalTodoAccess(user);
      if (access === 'unauthenticated') return { user: null, response: jsonError('Authentication required.', 401, 'UNAUTHENTICATED') };
      if (access === 'forbidden') return { user: null, response: jsonError('You do not have permission to perform this action.', 403, 'FORBIDDEN') };
      return { user, response: null };
    } catch {
      return { user: null, response: failedToAuthenticate() };
    }
  }

  return {
    PATCH: async (request: Request, todoId: string) => {
      if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');
      const auth = await organizer();
      if (auth.response) return auth.response;
      const body = await request.json().catch(() => null) as { isCompleted?: unknown } | null;
      if (typeof body?.isCompleted !== 'boolean') return jsonError('A completion state is required.', 422, 'INVALID_TODO');
      try {
        const todo = setPersonalTodoCompletion(dependencies.getDatabase(), auth.user!.id, todoId, body.isCompleted);
        return todo ? NextResponse.json({ todo }) : jsonError('Task not found.', 404, 'TODO_NOT_FOUND');
      } catch {
        return jsonError('Could not update your task. Please try again.', 500, 'TODO_UPDATE_FAILED');
      }
    },
    DELETE: async (request: Request, todoId: string) => {
      if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');
      const auth = await organizer();
      if (auth.response) return auth.response;
      try {
        const deleted = deletePersonalTodo(dependencies.getDatabase(), auth.user!.id, todoId);
        return deleted ? NextResponse.json({ success: true }) : jsonError('Task not found.', 404, 'TODO_NOT_FOUND');
      } catch {
        return jsonError('Could not delete your task. Please try again.', 500, 'TODO_DELETE_FAILED');
      }
    },
  };
}
