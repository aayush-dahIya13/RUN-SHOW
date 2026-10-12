import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/server/auth';
import { db, id, nowIso } from '@/lib/server/db';
import { jsonError, requireRole, validOrigin } from '@/lib/server/http';

type Context = { params: Promise<{ eventId: string }> };

export async function GET(_request: Request, context: Context) {
  const user = await currentUser(); const denied = requireRole(user, ['organizer', 'sub_organizer']); if (denied) return denied;
  const { eventId } = await context.params;
  if (user!.role === 'organizer') {
    const event = db().prepare('SELECT id FROM events WHERE id=? AND organizer_id=?').get(eventId, user!.id);
    if (!event) return jsonError('Event not found.', 404, 'EVENT_NOT_FOUND');
  }
  const rows = db().prepare(`
    SELECT
      ta.id as assignment_id, ta.responsibility, ta.status as assignment_status,
      u.id, u.name, u.email, u.role,
      COALESCE(rp.availability, 'available') as availability,
      COALESCE(rp.skills, 'operations') as skills,
      COALESCE(rp.zones, 'all') as zones,
      (SELECT COUNT(*) FROM incidents i
       WHERE i.assigned_responder_id = u.id
         AND i.status NOT IN ('resolved','closed')
         AND i.event_id = ta.event_id
      ) as active_incidents
    FROM team_assignments ta
    JOIN users u ON u.id = ta.user_id
    LEFT JOIN responder_profiles rp ON rp.user_id = u.id
    WHERE ta.event_id=? AND ta.status='active'
    ORDER BY u.name
  `).all(eventId);
  return NextResponse.json(rows);
}

export async function POST(request: Request, context: Context) {
  if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');
  const user = await currentUser(); const denied = requireRole(user, ['organizer']); if (denied) return denied;
  const { eventId } = await context.params;
  if (!db().prepare('SELECT id FROM events WHERE id=? AND organizer_id=?').get(eventId, user!.id)) return jsonError('Event not found.', 404, 'EVENT_NOT_FOUND');
  const body = await request.json().catch(() => null) as { userId?: unknown; responsibility?: unknown } | null;
  const userId = typeof body?.userId === 'string' ? body.userId : ''; const responsibility = typeof body?.responsibility === 'string' ? body.responsibility.trim() : '';
  if (!userId || !responsibility) return jsonError('User and responsibility are required.', 422, 'INVALID_ASSIGNMENT');
  const assigned = db().prepare("SELECT id FROM users WHERE id=? AND role='sub_organizer' AND status='active'").get(userId);
  if (!assigned) return jsonError('Only active sub-organizer accounts can be assigned.', 422, 'INVALID_ASSIGNEE');
  const timestamp = nowIso(); const assignmentId = id('assignment');
  try { db().prepare('INSERT INTO team_assignments(id,event_id,user_id,responsibility,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(assignmentId, eventId, userId, responsibility, 'active', timestamp, timestamp); }
  catch { return jsonError('This assignment already exists.', 409, 'ASSIGNMENT_EXISTS'); }
  return NextResponse.json(db().prepare('SELECT ta.*,u.name,u.email,u.role FROM team_assignments ta JOIN users u ON u.id=ta.user_id WHERE ta.id=?').get(assignmentId), { status: 201 });
}
