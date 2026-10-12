import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { db, id, nowIso } from './db';

const scrypt = promisify(nodeScrypt);
export const SESSION_COOKIE = 'runshow_session';
const SESSION_DAYS = 7;

export type ServerRole = 'organizer' | 'sub_organizer' | 'participant';
export interface ServerUser { id: string; name: string; email: string; role: ServerRole; status: 'active' | 'inactive' }

export function normalizeEmail(value: string): string { return value.trim().toLowerCase(); }
export function publicUser(row: Record<string, unknown>): ServerUser {
  return { id: String(row.id), name: String(row.name), email: String(row.email), role: row.role as ServerRole, status: row.status as 'active' | 'inactive' };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [, saltHex, hashHex] = encoded.split('$');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function sessionDigest(token: string): string { return createHash('sha256').update(token).digest('hex'); }

export async function currentUser(): Promise<ServerUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db().prepare(`SELECT u.* FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>? AND u.status='active'`).get(sessionDigest(token), nowIso());
  return row ? publicUser(row) : null;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  db().prepare('INSERT INTO auth_sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(sessionDigest(token), userId, expires, nowIso());
  return { token, expires };
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
