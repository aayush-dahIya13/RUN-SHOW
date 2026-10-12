import { NextResponse } from 'next/server';
import { db, id, nowIso } from '@/lib/server/db';
import { createSession, hashPassword, normalizeEmail, publicUser, sessionCookie, validatePassword } from '@/lib/server/auth';
import { jsonError, validOrigin } from '@/lib/server/http';

export async function POST(request: Request) {
  if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');
  const body = await request.json().catch(() => null) as { name?: unknown; email?: unknown; password?: unknown } | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const passwordError = validatePassword(password);
  if (name.length < 2 || name.length > 120) return jsonError('Enter a name between 2 and 120 characters.', 422, 'INVALID_NAME');
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return jsonError('Enter a valid email address.', 422, 'INVALID_EMAIL');
  if (passwordError) return jsonError(passwordError, 422, 'INVALID_PASSWORD');
  if (db().prepare('SELECT id FROM users WHERE email=?').get(email)) return jsonError('An account with this email already exists.', 409, 'EMAIL_EXISTS');

  const timestamp = nowIso();
  const userId = id('usr');
  db().prepare('INSERT INTO users(id,name,email,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(userId, name, email, await hashPassword(password), 'participant', 'active', timestamp, timestamp);
  const created = db().prepare('SELECT * FROM users WHERE id=?').get(userId)!;
  const session = await createSession(userId);
  const response = NextResponse.json({ user: publicUser(created) }, { status: 201 });
  response.cookies.set(sessionCookie(session.token, session.expires));
  return response;
}
