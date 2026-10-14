import { createHash, randomBytes } from 'node:crypto';
import { createSession, hashPassword, normalizeEmail, type ServerRole } from './auth-credentials.ts';
import { id, nowIso, type SqliteDatabase } from './db.ts';

export class SignupConflictError extends Error {}
export class InvalidTeamInvitationError extends Error {}
export class InvitationIdentityMismatchError extends Error {}

function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }

function acceptTeamInvitationInTransaction(database: SqliteDatabase, token: string, userId: string, email: string) {
  const invitation = database.prepare(`SELECT ti.*,e.name AS event_name FROM team_invitations ti JOIN events e ON e.id=ti.event_id AND e.organizer_id=ti.organizer_id WHERE ti.token_hash=?`).get(tokenHash(token));
  const now = nowIso();
  if (!invitation || invitation.status !== 'pending' || Date.parse(String(invitation.expires_at)) <= Date.now()) throw new InvalidTeamInvitationError();
  const account = database.prepare("SELECT id,role,status,email FROM users WHERE id=? AND status='active'").get(userId);
  if (!account || account.role !== 'sub_organizer') throw new InvalidTeamInvitationError();
  if (invitation.intended_email && normalizeEmail(String(invitation.intended_email)) !== normalizeEmail(email)) throw new InvitationIdentityMismatchError();
  if (!database.prepare("SELECT id FROM users WHERE id=? AND role='organizer' AND status='active'").get(invitation.organizer_id)) throw new InvalidTeamInvitationError();

  const existing = database.prepare('SELECT id FROM team_assignments WHERE event_id=? AND user_id=? AND responsibility=?').get(invitation.event_id, userId, invitation.responsibility);
  const membershipStatus = Number(invitation.requires_approval) ? 'inactive' : 'active';
  if (existing) {
    database.prepare('UPDATE team_assignments SET status=?,updated_at=? WHERE id=?').run(membershipStatus, now, existing.id);
  } else {
    database.prepare(`INSERT INTO team_assignments(id,event_id,user_id,responsibility,status,permissions_json,zones,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`)
      .run(id('assignment'), invitation.event_id, userId, invitation.responsibility, membershipStatus, invitation.responsibilities_json, invitation.zones, now, now);
  }
  database.prepare(`UPDATE team_invitations SET status=?,accepted_by=?,accepted_at=?,updated_at=? WHERE id=? AND status='pending'`)
    .run(Number(invitation.requires_approval) ? 'pending_approval' : 'accepted', userId, now, now, invitation.id);
  return { eventId: String(invitation.event_id), eventName: String(invitation.event_name), requiresApproval: Boolean(invitation.requires_approval) };
}

export function acceptTeamInvitation(database: SqliteDatabase, token: string, userId: string, email: string) {
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = acceptTeamInvitationInTransaction(database, token, userId, email);
    database.exec('COMMIT');
    return result;
  } catch (error) {
    try { database.exec('ROLLBACK'); } catch { /* transaction already closed */ }
    throw error;
  }
}

export async function signupAccount(database: SqliteDatabase, input: { name: string; email: string; password: string; role: ServerRole; teamInvitationToken?: string }) {
  const email = normalizeEmail(input.email);
  if (input.role === 'sub_organizer' && !input.teamInvitationToken) throw new InvalidTeamInvitationError();
  if (input.role !== 'sub_organizer' && input.teamInvitationToken) throw new InvalidTeamInvitationError();
  const encoded = await hashPassword(input.password);
  const userId = id('usr');
  const now = nowIso();
  database.exec('BEGIN IMMEDIATE');
  try {
    if (database.prepare('SELECT id FROM users WHERE lower(trim(email))=? LIMIT 1').get(email)) throw new SignupConflictError();
    database.prepare(`INSERT INTO users(id,name,email,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,'active',?,?)`)
      .run(userId, input.name.trim(), email, encoded, input.role, now, now);
    const invitation = input.teamInvitationToken
      ? acceptTeamInvitationInTransaction(database, input.teamInvitationToken, userId, email)
      : null;
    const session = await createSession(userId, database);
    database.exec('COMMIT');
    return { id: userId, name: input.name.trim(), email, role: input.role, status: 'active' as const, invitation, session };
  } catch (error) {
    try { database.exec('ROLLBACK'); } catch { /* transaction already closed */ }
    throw error;
  }
}

export function createRawTeamInviteToken() { return randomBytes(32).toString('base64url'); }
export function digestTeamInviteToken(token: string) { return tokenHash(token); }
