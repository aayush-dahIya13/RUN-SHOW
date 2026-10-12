import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/server/auth';
import { canAccessEvent } from '@/lib/server/event-repository';
import { jsonError, requireRole } from '@/lib/server/http';

type Context = { params: Promise<{ eventId: string }> };

export async function GET(_request: Request, context: Context) {
  const user = await currentUser(); const denied = requireRole(user, ['organizer', 'sub_organizer']); if (denied) return denied;
  const { eventId } = await context.params; if (!canAccessEvent(eventId, user!.id, user!.role)) return jsonError('Event not found.', 404, 'EVENT_NOT_FOUND');
  return NextResponse.json([]);
}
