import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { canAccessEvent, taskFromRow } from '@/lib/server/event-repository';
import { jsonError, requireRole, validOrigin } from '@/lib/server/http';

type Context = { params: Promise<{ taskId: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');
  const user = await currentUser(); const denied = requireRole(user, ['organizer', 'sub_organizer']); if (denied) return denied;
  const { taskId } = await context.params;
  const task = db().prepare('SELECT * FROM tasks WHERE id=?').get(taskId);
  if (!task || !canAccessEvent(String(task.event_id), user!.id, user!.role)) return jsonError('Task not found.', 404, 'TASK_NOT_FOUND');
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const now = new Date().toISOString();

  const newStatus = body?.status ? String(body.status) : undefined;
  if (newStatus && !['pending', 'in-progress', 'completed', 'blocked'].includes(newStatus)) {
    return jsonError('A valid task status is required.', 422, 'INVALID_STATUS');
  }

  const title = body?.title !== undefined ? String(body.title).trim() : undefined;
  const description = body?.description !== undefined ? String(body.description) : undefined;
  const priority = body?.priority !== undefined ? String(body.priority) : undefined;
  const deadline = body?.deadline !== undefined ? String(body.deadline) : undefined;
  const department = body?.functionName !== undefined ? (String(body.functionName) || null) : undefined;

  db().prepare(`
    UPDATE tasks
    SET status=COALESCE(?, status),
        title=COALESCE(?, title),
        description=COALESCE(?, description),
        priority=COALESCE(?, priority),
        due_at=COALESCE(?, due_at),
        department=COALESCE(?, department),
        updated_at=?
    WHERE id=?
  `).run(
    newStatus ?? null,
    title ?? null,
    description ?? null,
    priority ?? null,
    deadline ?? null,
    department ?? null,
    now,
    taskId
  );

  return NextResponse.json(taskFromRow(db().prepare('SELECT * FROM tasks WHERE id=?').get(taskId)!));
}
