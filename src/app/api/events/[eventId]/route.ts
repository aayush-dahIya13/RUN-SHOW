import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { canAccessEvent, eventFromRow } from '@/lib/server/event-repository';
import { jsonError, requireRole, validOrigin } from '@/lib/server/http';

type Context = { params: Promise<{ eventId: string }> };

export async function GET(_request: Request, context: Context) {
  const user = await currentUser();
  const denied = requireRole(user, ['organizer', 'sub_organizer', 'participant']);
  if (denied) return denied;
  const { eventId } = await context.params;
  if (!canAccessEvent(eventId, user!.id, user!.role)) return jsonError('Event not found.', 404, 'EVENT_NOT_FOUND');
  const row = db().prepare('SELECT * FROM events WHERE id=?').get(eventId);
  return row ? NextResponse.json(eventFromRow(row)) : jsonError('Event not found.', 404, 'EVENT_NOT_FOUND');
}

export async function PATCH(request: Request, context: Context) {
  if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');
  const user = await currentUser();
  const denied = requireRole(user, ['organizer']);
  if (denied) return denied;
  const { eventId } = await context.params;
  const row = db().prepare('SELECT * FROM events WHERE id=? AND organizer_id=?').get(eventId, user!.id);
  if (!row) return jsonError('Event not found.', 404, 'EVENT_NOT_FOUND');
  const body = await request.json().catch(() => null) as { lifecycle?: string } | null;
  if (!body?.lifecycle || !['draft', 'upcoming', 'in-progress', 'completed', 'cancelled'].includes(body.lifecycle)) return jsonError('A valid lifecycle status is required.', 422, 'INVALID_STATUS');
  db().prepare('UPDATE events SET lifecycle=?,updated_at=? WHERE id=?').run(body.lifecycle, new Date().toISOString(), eventId);
  return NextResponse.json(eventFromRow(db().prepare('SELECT * FROM events WHERE id=?').get(eventId)!));
}
