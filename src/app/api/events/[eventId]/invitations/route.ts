import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/server/auth';
import { db, id, nowIso } from '@/lib/server/db';
import { canAccessEvent } from '@/lib/server/event-repository';
import { jsonError, requireRole, validOrigin } from '@/lib/server/http';

interface InvitationRow {
  id: string;
  event_id: string;
  code: string;
  token: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  status: string;
  revoked_at: string | null;
  revoked_by: string | null;
}

type Context = { params: Promise<{ eventId: string }> };

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(_request: Request, context: Context) {
  const user = await currentUser();
  const denied = requireRole(user, ['organizer', 'sub_organizer']);
  if (denied) return denied;

  const { eventId } = await context.params;
  if (!canAccessEvent(eventId, user!.id, user!.role)) return jsonError('Event not found.', 404, 'EVENT_NOT_FOUND');

  const database = db();
  const invitations = database.prepare('SELECT * FROM invitations WHERE event_id = ? ORDER BY created_at DESC').all(eventId) as unknown as InvitationRow[];

  return NextResponse.json(invitations.map(inv => ({
    id: inv.id,
    eventId: inv.event_id,
    code: inv.code,
    token: inv.token,
    createdBy: inv.created_by,
    createdAt: inv.created_at,
    expiresAt: inv.expires_at,
    maxUses: inv.max_uses,
    usedCount: inv.used_count,
    status: inv.status,
    revokedAt: inv.revoked_at,
    revokedBy: inv.revoked_by,
  })));
}

export async function POST(request: Request, context: Context) {
  if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');
  const user = await currentUser();
  const denied = requireRole(user, ['organizer', 'sub_organizer']);
  if (denied) return denied;

  const { eventId } = await context.params;
  if (!canAccessEvent(eventId, user!.id, user!.role)) return jsonError('Event not found.', 404, 'EVENT_NOT_FOUND');

  const body = await request.json().catch(() => null) as { expiresAt?: string; maxUses?: number } | null;
  if (!body) return jsonError('A JSON body is required.', 422, 'INVALID_BODY');

  const database = db();

  // Check if event is private (only private events can have invitations)
  const event = database.prepare('SELECT * FROM events WHERE id = ?').get(eventId) as { visibility: string } | undefined;
  if (!event) return jsonError('Event not found.', 404, 'EVENT_NOT_FOUND');

  const code = generateCode();
  const token = generateToken();
  const invitationId = id('inv');
  const timestamp = nowIso();

  database.prepare(`
    INSERT INTO invitations(id, event_id, code, token, created_by, created_at, expires_at, max_uses, used_count, status, created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)
  `).run(invitationId, eventId, code, token, user!.id, timestamp, body.expiresAt || null, body.maxUses || null, 0, 'active', timestamp);

  const invitation = database.prepare('SELECT * FROM invitations WHERE id = ?').get(invitationId) as InvitationRow | undefined;

  if (!invitation) return jsonError('Failed to create invitation.', 500, 'INVITATION_CREATION_FAILED');

  return NextResponse.json({
    id: invitation.id,
    eventId: invitation.event_id,
    code: invitation.code,
    token: invitation.token,
    createdBy: invitation.created_by,
    createdAt: invitation.created_at,
    expiresAt: invitation.expires_at,
    maxUses: invitation.max_uses,
    usedCount: invitation.used_count,
    status: invitation.status,
    revokedAt: invitation.revoked_at,
    revokedBy: invitation.revoked_by,
    joinUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/join/${code}`,
  }, { status: 201 });
}