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
  const body = await request.json().catch(() => null) as { status?: string } | null;
  if (!body?.status || !['pending', 'in-progress', 'completed', 'blocked'].includes(body.status)) return jsonError('A valid task status is required.', 422, 'INVALID_STATUS');
  db().prepare('UPDATE tasks SET status=?,updated_at=? WHERE id=?').run(body.status, new Date().toISOString(), taskId);
  return NextResponse.json(taskFromRow(db().prepare('SELECT * FROM tasks WHERE id=?').get(taskId)!));
}
