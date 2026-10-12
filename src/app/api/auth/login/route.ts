import { NextResponse } from 'next/server';
import { db, nowIso } from '@/lib/server/db';
import { createSession, ensureBootstrapOrganizer, normalizeEmail, publicUser, sessionCookie, verifyPassword } from '@/lib/server/auth';
import { jsonError, validOrigin } from '@/lib/server/http';

export async function POST(request: Request) {
  if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');
  await ensureBootstrapOrganizer();
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const user = db().prepare('SELECT * FROM users WHERE email=? AND status=\'active\'').get(email);
  if (!user || !(await verifyPassword(password, String(user.password_hash)))) return jsonError('Email or password is incorrect.', 401, 'INVALID_CREDENTIALS');
  db().prepare('DELETE FROM auth_sessions WHERE expires_at<=?').run(nowIso());
  const session = await createSession(String(user.id));
  const response = NextResponse.json({ user: publicUser(user) });
  response.cookies.set(sessionCookie(session.token, session.expires));
  return response;
}
