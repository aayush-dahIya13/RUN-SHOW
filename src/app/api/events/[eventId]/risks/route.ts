import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { canAccessEvent } from '@/lib/server/event-repository';
import { jsonError, requireRole } from '@/lib/server/http';

type Context = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, context: Context) {
  const user = await currentUser(); const denied = requireRole(user, ['organizer', 'sub_organizer']); if (denied) return denied;
  const { eventId } = await context.params; if (!canAccessEvent(eventId, user!.id, user!.role)) return jsonError('Event not found.', 404, 'EVENT_NOT_FOUND');
  const url = new URL(request.url); const filters = ['severity', 'status'].filter(key => url.searchParams.get(key)).map(key => `${key}=?`);
  const values = ['severity', 'status'].map(key => url.searchParams.get(key)).filter(Boolean) as string[];
  const rows = db().prepare(`SELECT id,event_id,title,description AS reason,severity,status,evidence FROM risks WHERE event_id=? ${filters.length ? `AND ${filters.join(' AND ')}` : ''} ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`).all(eventId, ...values);
  return NextResponse.json(rows);
}
