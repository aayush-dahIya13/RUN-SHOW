import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { db, id, nowIso, type SqliteDatabase } from './db.ts';
import {
  createSession as persistSession,
  hashPassword,
  normalizeEmail,
  publicUser,
  type ServerUser,
} from './auth-credentials.ts';

export { authenticateUser, hashPassword, normalizeEmail, publicUser, verifyPassword } from './auth-credentials.ts';
export type { ServerRole, ServerUser } from './auth-credentials.ts';
export const SESSION_COOKIE = 'runshow_session';

function sessionDigest(token: string): string { return createHash('sha256').update(token).digest('hex'); }

export async function currentUser(): Promise<ServerUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db().prepare(`SELECT u.* FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>? AND u.status='active'`).get(sessionDigest(token), nowIso());
  return row ? publicUser(row) : null;
}

export async function createSession(userId: string, database: SqliteDatabase = db()) {
  return persistSession(userId, database);
}

export async function deleteCurrentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) db().prepare('DELETE FROM auth_sessions WHERE id=?').run(sessionDigest(token));
}

export function sessionCookie(token: string, expires: string) {
  return { name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', expires: new Date(expires), path: '/' };
}

export function expiredSessionCookie() {
  return { name: SESSION_COOKIE, value: '', httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: 0, path: '/' };
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 200) return 'Password is too long.';
  return null;
}

export async function ensureBootstrapOrganizer() {
  const email = process.env.RUNSHOW_BOOTSTRAP_ORGANIZER_EMAIL && normalizeEmail(process.env.RUNSHOW_BOOTSTRAP_ORGANIZER_EMAIL);
  const password = process.env.RUNSHOW_BOOTSTRAP_ORGANIZER_PASSWORD;
  if (!email || !password || db().prepare('SELECT id FROM users WHERE email=?').get(email)) return;
  const timestamp = nowIso();
  db().prepare('INSERT INTO users(id,name,email,password_hash,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id('usr'), process.env.RUNSHOW_BOOTSTRAP_ORGANIZER_NAME?.trim() || 'Organizer', email, await hashPassword(password), 'organizer', 'active', timestamp, timestamp);
}
