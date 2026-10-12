import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/server/auth';
import { db, id, nowIso } from '@/lib/server/db';
import { canAccessEvent } from '@/lib/server/event-repository';
import { jsonError, requireRole } from '@/lib/server/http';

interface InvitationRow {
  id: string;
  code: string;
  event_id: string;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  status: string;
  revoked_at: string | null;
}

interface EventRow {
  id: string;
  name: string;
  event_type: string;
  start_at: string;
  end_at: string;
  timezone: string;
  format: 'in-person' | 'virtual' | 'hybrid';
  venue: string | null;
  meeting_url: string | null;
  joining_instructions: string | null;
  audience: string;
  capacity: number | null;
  registration_target: number;
  eligibility_requirements: string | null;
  registration_deadline: string | null;
}

type Context = { params: Promise<{ code: string }> };

export async function GET(_request: Request, context: Context) {
  const sessionUser = await currentUser();
  // Allow unauthenticated access to view invitation details, but require auth to join
  const { code } = await context.params;

  const database = db();
  const invitation = database.prepare('SELECT * FROM invitations WHERE code = ?').get(code) as InvitationRow | undefined;

  if (!invitation) return jsonError('Invalid invitation code.', 404, 'INVALID_INVITATION');

  const event = database.prepare('SELECT * FROM events WHERE id = ?').get(invitation.event_id) as EventRow | undefined;
  if (!event) return jsonError('Associated event not found.', 404, 'EVENT_NOT_FOUND');

  // Check invitation status
  let status: 'valid' | 'expired' | 'revoked' | 'exhausted' | 'invalid' = 'valid';
  let message = '';

  if (invitation.status !== 'active') {
    status = invitation.status as 'expired' | 'revoked' | 'exhausted';
    message = `This invitation has been ${status}.`;
  } else if (invitation.expires_at && Date.parse(invitation.expires_at) < Date.now()) {
    status = 'expired';
    message = 'This invitation has expired.';
  } else if (invitation.max_uses && invitation.used_count >= invitation.max_uses) {
    status = 'exhausted';
    message = 'This invitation has reached its usage limit.';
  } else if (invitation.revoked_at) {
    status = 'revoked';
    message = 'This invitation has been revoked.';
  }

  // Check if user is already registered
  let alreadyRegistered = false;
  let userCanJoin = true;
  if (sessionUser) {
    const existingReg = database.prepare('SELECT * FROM registrations WHERE event_id = ? AND participant_id = ? AND status <> \'cancelled\'').get(event.id, sessionUser.id);
    if (existingReg) {
      alreadyRegistered = true;
      userCanJoin = false;
    }
  }

  return NextResponse.json({
    invitation: {
      id: invitation.id,
      code: invitation.code,
      eventId: invitation.event_id,
      expiresAt: invitation.expires_at,
      maxUses: invitation.max_uses,
      usedCount: invitation.used_count,
      status: invitation.status,
    },
    event: {
      id: event.id,
      name: event.name,
      type: event.event_type,
      date: event.start_at.slice(0, 10),
      startDate: event.start_at.slice(0, 10),
      endDate: event.end_at.slice(0, 10),
      startTime: event.start_at.slice(11, 16),
      endTime: event.end_at.slice(11, 16),
      timezone: event.timezone,
      format: event.format,
      venue: event.venue,
      meetingUrl: event.meeting_url,
      joiningInstructions: event.joining_instructions,
      audience: event.audience,
      participantCapacity: event.capacity,
      currentRegistrations: 0,
      targetRegistrations: event.registration_target,
      eligibilityRequirements: event.eligibility_requirements,
    },
    status,
    message,
    alreadyRegistered,
    userCanJoin,
    requiresAuth: !sessionUser,
  });
}

export async function POST(request: Request, context: Context) {
  const user = await currentUser();
  if (!user) return jsonError('Authentication required to join an event.', 401, 'UNAUTHENTICATED');

  const denied = requireRole(user, ['participant']);
  if (denied) return denied;

  const { code } = await context.params;
  const database = db();

  const invitation = database.prepare('SELECT * FROM invitations WHERE code = ?').get(code) as InvitationRow | undefined;
  if (!invitation) return jsonError('Invalid invitation code.', 404, 'INVALID_INVITATION');

  const event = database.prepare('SELECT * FROM events WHERE id = ?').get(invitation.event_id) as EventRow | undefined;
  if (!event) return jsonError('Associated event not found.', 404, 'EVENT_NOT_FOUND');

  // Validate invitation
  if (invitation.status !== 'active') return jsonError('This invitation is no longer valid.', 422, 'INVITATION_INVALID');
  if (invitation.expires_at && Date.parse(invitation.expires_at) < Date.now()) return jsonError('This invitation has expired.', 422, 'INVITATION_EXPIRED');
  if (invitation.max_uses && invitation.used_count >= invitation.max_uses) return jsonError('This invitation has reached its usage limit.', 422, 'INVITATION_EXHAUSTED');
  if (invitation.revoked_at) return jsonError('This invitation has been revoked.', 422, 'INVITATION_REVOKED');

  // Check if already registered
  const existingReg = database.prepare('SELECT * FROM registrations WHERE event_id = ? AND participant_id = ? AND status <> \'cancelled\'').get(event.id, user.id);
  if (existingReg) return jsonError('You are already registered for this event.', 422, 'ALREADY_REGISTERED');

  // Check event capacity
  if (event.capacity) {
    const currentRegs = database.prepare('SELECT COUNT(*) as count FROM registrations WHERE event_id = ? AND status = \'confirmed\'').get(event.id) as { count: number } | undefined;
    if ((currentRegs?.count || 0) >= (event.capacity as number)) {
      return jsonError('Event has reached maximum capacity.', 422, 'EVENT_FULL');
    }
  }

  // Check registration deadline
  if (event.registration_deadline && Date.parse(event.registration_deadline) < Date.now()) {
    return jsonError('Registration deadline has passed.', 422, 'REGISTRATION_CLOSED');
  }

  // Create registration
  const registrationId = id('reg');
  const referenceNumber = `REG-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = nowIso();

  database.exec('BEGIN');
  try {
    database.prepare(`
      INSERT INTO registrations(id, event_id, participant_id, invitation_code, status, payment_status, reference_number, created_at, updated_at)
      VALUES(?,?,?,?,?,?,?,?,?)
    `).run(registrationId, event.id, user.id, code, 'confirmed', 'not_applicable', referenceNumber, timestamp, timestamp);

    // Update invitation used count
    database.prepare('UPDATE invitations SET used_count = used_count + 1 WHERE code = ?').run(code);

    // Update event registration count
    database.prepare('UPDATE events SET current_registrations = current_registrations + 1 WHERE id = ?').run(event.id);

    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  return NextResponse.json({
    message: 'Successfully joined the event!',
    registration: {
      referenceNumber,
      eventName: event.name,
    },
  }, { status: 201 });
}