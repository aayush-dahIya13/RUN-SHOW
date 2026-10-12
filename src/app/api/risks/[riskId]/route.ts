import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { canAccessEvent } from '@/lib/server/event-repository';
import { jsonError, requireRole, validOrigin } from '@/lib/server/http';

type Context = { params: Promise<{ riskId: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');
  const user = await currentUser(); const denied = requireRole(user, ['organizer', 'sub_organizer']); if (denied) return denied;
  const { riskId } = await context.params; const risk = db().prepare('SELECT * FROM risks WHERE id=?').get(riskId);
  if (!risk || !canAccessEvent(String(risk.event_id), user!.id, user!.role)) return jsonError('Risk not found.', 404, 'RISK_NOT_FOUND');
  const body = await request.json().catch(() => null) as { status?: string } | null;
  if (!body?.status || !['open', 'in-progress', 'mitigated', 'closed'].includes(body.status)) return jsonError('A valid risk status is required.', 422, 'INVALID_STATUS');
  db().prepare('UPDATE risks SET status=?,updated_at=? WHERE id=?').run(body.status, new Date().toISOString(), riskId);
  return NextResponse.json(db().prepare('SELECT id,event_id,title,description AS reason,severity,status,evidence FROM risks WHERE id=?').get(riskId));
}
