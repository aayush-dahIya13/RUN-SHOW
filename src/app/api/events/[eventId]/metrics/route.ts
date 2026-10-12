import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { canAccessEvent } from '@/lib/server/event-repository';
import { jsonError, requireRole } from '@/lib/server/http';

type Context = { params: Promise<{ eventId: string }> };

export async function GET(_request: Request, context: Context) {
  const user = await currentUser(); const denied = requireRole(user, ['organizer', 'sub_organizer']); if (denied) return denied;
  const { eventId } = await context.params; if (!canAccessEvent(eventId, user!.id, user!.role)) return jsonError('Event not found.', 404, 'EVENT_NOT_FOUND');
  const event = db().prepare('SELECT registration_target,capacity FROM events WHERE id=?').get(eventId)!;
  const taskCounts = db().prepare("SELECT COUNT(*) AS total,SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed FROM tasks WHERE event_id=?").get(eventId)!;
  const target = Number(event.registration_target); const completed = Number(taskCounts.completed || 0); const total = Number(taskCounts.total || 0);
  return NextResponse.json({ registrations: { current: 0, target, gap: target, percentage: 0 }, partnerConfirmations: { current: 0, total: 0, percentage: 0 }, taskCompletion: { completed, total, percentage: total ? Math.round(completed / total * 100) : 0 }, eventReadiness: total ? Math.round(completed / total * 100) : 0 });
}
