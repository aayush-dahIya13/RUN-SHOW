export interface PersonalTodo {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type PersonalTodoFilter = 'all' | 'active' | 'completed';

export function personalTodoAccess(user: { role: string; status: string } | null): 'unauthenticated' | 'forbidden' | null {
  if (!user) return 'unauthenticated';
  return user.role === 'organizer' && user.status === 'active' ? null : 'forbidden';
}

export function filterPersonalTodos(todos: PersonalTodo[], filter: PersonalTodoFilter): PersonalTodo[] {
  if (filter === 'active') return todos.filter(todo => !todo.isCompleted);
  if (filter === 'completed') return todos.filter(todo => todo.isCompleted);
  return todos;
}
