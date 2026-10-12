import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { createEvent, eventFromRow, accessibleEventWhere } from '@/lib/server/event-repository';
import { jsonError, requireRole, validOrigin } from '@/lib/server/http';

export async function GET() {
  const user = await currentUser();
  const denied = requireRole(user, ['organizer', 'sub_organizer', 'participant']);
  if (denied) return denied;
  const access = accessibleEventWhere(user!.id, user!.role);
  const rows = db().prepare(`SELECT e.* FROM events e WHERE ${access.sql} ORDER BY e.start_at`).all(...access.values);
  return NextResponse.json(rows.map(eventFromRow));
}

export async function POST(request: Request) {
  if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');
  const user = await currentUser();
  const denied = requireRole(user, ['organizer']);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return jsonError('A JSON event body is required.', 422, 'INVALID_BODY');
  try { return NextResponse.json(createEvent(body as Record<string, unknown>, user!.id), { status: 201 }); }
  catch (error) { return jsonError(error instanceof Error ? error.message : 'Event could not be saved.', 422, 'EVENT_VALIDATION_FAILED'); }
}
