import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { canAccessEvent } from '@/lib/server/event-repository';
import { jsonError, requireRole } from '@/lib/server/http';

type Context = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, context: Context) {
  const user = await currentUser(); const denied = requireRole(user, ['organizer', 'sub_organizer']); if (denied) return denied;
  const { eventId } = await context.params; if (!canAccessEvent(eventId, user!.id, user!.role)) return jsonError('Event not found.', 404, 'EVENT_NOT_FOUND');
  const url = new URL(request.url); const priority = url.searchParams.get('priority');
  const rows = db().prepare(`SELECT id,event_id,action,reason,priority FROM recommendations WHERE event_id=? ${priority ? 'AND priority=?' : ''} ORDER BY created_at DESC`).all(...(priority ? [eventId, priority] : [eventId]));
  return NextResponse.json(rows);
}
