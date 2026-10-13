import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { nowIso, type SqliteDatabase } from './db.ts';

const scrypt = promisify(nodeScrypt);

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
  // The original team-creation endpoint stored a bare SHA-256 digest. Accept
  // only that exact legacy format so old accounts can authenticate once and
  // be upgraded below; all new credentials use salted scrypt.
  if (/^[a-f\d]{64}$/i.test(encoded)) {
    const expected = Buffer.from(encoded, 'hex');
    const actual = createHash('sha256').update(password).digest();
    return timingSafeEqual(expected, actual);
  }

  const match = /^scrypt\$([a-f\d]{32})\$([a-f\d]{128})$/i.exec(encoded);
  if (!match) return false;
  try {
    const expected = Buffer.from(match[2], 'hex');
    const actual = await scrypt(password, Buffer.from(match[1], 'hex'), expected.length) as Buffer;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function authenticateUser(database: SqliteDatabase, emailInput: string, password: string): Promise<ServerUser | null> {
  const user = database.prepare("SELECT * FROM users WHERE email=? AND status='active'").get(normalizeEmail(emailInput));
  if (!user) return null;

  const encoded = String(user.password_hash);
  const legacyPassword = /^[a-f\d]{64}$/i.test(encoded);
  if (legacyPassword && user.role !== 'sub_organizer') return null;
  if (!(await verifyPassword(password, encoded))) return null;
  if (user.role === 'sub_organizer' && !database.prepare("SELECT 1 FROM team_assignments WHERE user_id=? AND status='active' LIMIT 1").get(String(user.id))) return null;

  if (legacyPassword) {
    const upgradedHash = await hashPassword(password);
    database.prepare('UPDATE users SET password_hash=?,updated_at=? WHERE id=? AND password_hash=?')
      .run(upgradedHash, nowIso(), String(user.id), encoded);
  }
  return publicUser(user);
}

function sessionDigest(token: string): string { return createHash('sha256').update(token).digest('hex'); }

export async function createSession(userId: string, database: SqliteDatabase) {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + 7 * 86_400_000).toISOString();
  database.prepare('INSERT INTO auth_sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(sessionDigest(token), userId, expires, nowIso());
  return { token, expires };
}
