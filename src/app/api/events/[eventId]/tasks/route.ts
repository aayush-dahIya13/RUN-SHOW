import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/server/auth';
import { db, id, nowIso } from '@/lib/server/db';
import { canAccessEvent, taskFromRow } from '@/lib/server/event-repository';
import { jsonError, requireRole, validOrigin } from '@/lib/server/http';

type Context = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, context: Context) {
  const user = await currentUser(); const denied = requireRole(user, ['organizer', 'sub_organizer']); if (denied) return denied;
  const { eventId } = await context.params; if (!canAccessEvent(eventId, user!.id, user!.role)) return jsonError('Event not found.', 404, 'EVENT_NOT_FOUND');
  const url = new URL(request.url); const status = url.searchParams.get('status');
  const rows = db().prepare(`SELECT t.* FROM tasks t WHERE t.event_id=? ${status ? 'AND t.status=?' : ''} ORDER BY t.due_at`).all(...(status ? [eventId, status] : [eventId]));
  return NextResponse.json(rows.map(taskFromRow));
}

export async function POST(request: Request, context: Context) {
  if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');
  const user = await currentUser(); const denied = requireRole(user, ['organizer', 'sub_organizer']); if (denied) return denied;
  const { eventId } = await context.params; if (!canAccessEvent(eventId, user!.id, user!.role)) return jsonError('Event not found.', 404, 'EVENT_NOT_FOUND');
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) return jsonError('Task title is required.', 422, 'INVALID_TASK');
  const timestamp = nowIso(); const taskId = id('task');
  db().prepare('INSERT INTO tasks(id,event_id,title,description,priority,status,due_at,owner_id,department,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(taskId, eventId, title, String(body?.description || ''), String(body?.priority || 'medium'), String(body?.status || 'pending'), String(body?.deadline || ''), null, String(body?.functionName || '') || null, timestamp, timestamp);
  return NextResponse.json(taskFromRow(db().prepare('SELECT * FROM tasks WHERE id=?').get(taskId)!), { status: 201 });
}
