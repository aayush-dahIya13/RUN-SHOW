import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { publicUser, sessionCookie, validatePassword } from '@/lib/server/auth';
import { jsonError, validOrigin } from '@/lib/server/http';
import { InvalidTeamInvitationError, InvitationIdentityMismatchError, signupAccount, SignupConflictError } from '@/lib/server/signup-repository';

export async function POST(request: Request) {
  if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');
  const body = await request.json().catch(() => null) as { name?: unknown; email?: unknown; password?: unknown; role?: unknown; teamInvitationToken?: unknown } | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const role = body?.role === 'organizer' || body?.role === 'sub_organizer' || body?.role === 'participant' ? body.role : 'participant';
  const teamInvitationToken = typeof body?.teamInvitationToken === 'string' ? body.teamInvitationToken : undefined;
  const passwordError = validatePassword(password);
  if (name.length < 2 || name.length > 120) return jsonError('Enter a name between 2 and 120 characters.', 422, 'INVALID_NAME');
  if (passwordError) return jsonError(passwordError, 422, 'INVALID_PASSWORD');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return jsonError('Enter a valid email address.', 422, 'INVALID_EMAIL');
  if (body?.role !== undefined && !['organizer', 'sub_organizer', 'participant'].includes(String(body.role))) return jsonError('Choose a supported account type.', 422, 'INVALID_ROLE');
  if (role === 'sub_organizer' && !teamInvitationToken) return jsonError('Sub-organizer signup requires a valid event invitation.', 403, 'TEAM_INVITATION_REQUIRED');
  if (role !== 'sub_organizer' && teamInvitationToken) return jsonError('This invitation is not valid for the selected account type.', 422, 'INVITATION_ROLE_MISMATCH');
  try {
    const created = await signupAccount(db(), { name, email, password, role, teamInvitationToken });
    const response = NextResponse.json({ user: publicUser(created), invitation: created.invitation }, { status: 201 });
    response.cookies.set(sessionCookie(created.session.token, created.session.expires));
    return response;
  } catch (error) {
    if (error instanceof SignupConflictError) return jsonError('An account with this email already exists. Sign in instead.', 409, 'EMAIL_EXISTS');
    if (error instanceof InvitationIdentityMismatchError) return jsonError('Use the email address this team invitation was sent to.', 403, 'INVITATION_EMAIL_MISMATCH');
    if (error instanceof InvalidTeamInvitationError) return jsonError('This team invitation is invalid, expired, revoked, or already used.', 410, 'INVALID_TEAM_INVITATION');
    return jsonError('Account registration could not be completed.', 500, 'SIGNUP_FAILED');
  }
}
