import { NextRequest, NextResponse } from 'next/server';
import { db, id, nowIso } from '@/lib/server/db';
import { currentUser } from '@/lib/server/auth';
import { jsonError, requireRole, validOrigin } from '@/lib/server/http';
import { createHash } from 'node:crypto';

function hashPassword(password: string): string {
  // Simple SHA-256 hash — matches the pattern used in the existing auth system
  return createHash('sha256').update(password).digest('hex');
}

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');

  const user = await currentUser();
  const authError = requireRole(user, ['organizer']);
  if (authError) return authError;

  const body = await request.json().catch(() => null) as {
    name?: unknown; email?: unknown; password?: unknown;
    responsibility?: unknown; eventId?: unknown;
    skills?: unknown; zones?: unknown;
  } | null;

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const responsibility = typeof body?.responsibility === 'string' ? body.responsibility.trim() : '';
  const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : '';
  const skills = typeof body?.skills === 'string' ? body.skills.trim() : 'operations';
  const zones = typeof body?.zones === 'string' ? body.zones.trim() : 'all';

  // Validation
  if (!name) return jsonError('Name is required.', 422, 'MISSING_NAME');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError('A valid email address is required.', 422, 'INVALID_EMAIL');
  }
  if (!password || password.length < 8) {
    return jsonError('Password must be at least 8 characters.', 422, 'WEAK_PASSWORD');
  }
  if (!responsibility) return jsonError('Responsibility is required.', 422, 'MISSING_RESPONSIBILITY');
  if (!eventId) return jsonError('Event ID is required.', 422, 'MISSING_EVENT');

  // Verify the event belongs to this organizer
  const event = db().prepare('SELECT id FROM events WHERE id=? AND organizer_id=?').get(eventId, user!.id);
  if (!event) return jsonError('Event not found or you are not the organizer.', 404, 'EVENT_NOT_FOUND');

  // Check for existing email
  const existing = db().prepare('SELECT id FROM users WHERE email=?').get(email);
  if (existing) return jsonError('A user with this email address already exists.', 409, 'EMAIL_EXISTS');

  const now = nowIso();
  const userId = id('user');
  const assignmentId = id('assignment');
  const profileId = userId;

  // Create user + team_assignment + responder_profile in a logical sequence
  // (node:sqlite's DatabaseSync doesn't expose transaction() but we can use exec)
  try {
    db().prepare(`
      INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'sub_organizer', 'active', ?, ?)
    `).run(userId, name, email, hashPassword(password), now, now);

    db().prepare(`
      INSERT INTO team_assignments (id, event_id, user_id, responsibility, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `).run(assignmentId, eventId, userId, responsibility, now, now);

    db().prepare(`
      INSERT INTO responder_profiles (user_id, skills, zones, availability, updated_at)
      VALUES (?, ?, ?, 'available', ?)
      ON CONFLICT(user_id) DO UPDATE SET skills=excluded.skills, zones=excluded.zones, updated_at=excluded.updated_at
    `).run(profileId, skills, zones, now);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[team/create] DB error:', msg);
    return jsonError('Failed to create sub-organizer account.', 500, 'DB_ERROR');
  }

  return NextResponse.json(
    {
      user: { id: userId, name, email, role: 'sub_organizer' },
      assignment: { id: assignmentId, eventId, responsibility },
      profile: { skills, zones, availability: 'available' },
    },
    { status: 201 }
  );
}
