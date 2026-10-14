import { hashPassword, normalizeEmail } from './auth-credentials.ts';
import { id, nowIso, type SqliteDatabase } from './db.ts';
import { upsertResponderProfile } from './team-repository.ts';

export class ExistingAccountError extends Error {
  constructor() {
    super('A user with this email address already exists.');
    this.name = 'ExistingAccountError';
  }
}

export interface CreateSubOrganizerInput {
  name: string;
  email: string;
  password: string;
  eventId: string;
  responsibility: string;
  skills: string;
  zones: string;
  phone: string | null;
  preferredContactMethod: string | null;
  permittedResponsibilities?: string[];
}

export async function createSubOrganizerAccount(database: SqliteDatabase, input: CreateSubOrganizerInput) {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const now = nowIso();
  const userId = id('usr');
  const assignmentId = id('assignment');

  database.exec('BEGIN IMMEDIATE');
  try {
    if (database.prepare('SELECT id FROM users WHERE lower(trim(email))=? LIMIT 1').get(email)) throw new ExistingAccountError();

    database.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'sub_organizer', 'active', ?, ?)
    `).run(userId, input.name, email, passwordHash, now, now);

    database.prepare(`
      INSERT INTO team_assignments (id, event_id, user_id, responsibility, status, permissions_json, zones, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)
    `).run(assignmentId, input.eventId, userId, input.responsibility, JSON.stringify(input.permittedResponsibilities ?? []), input.zones, now, now);

    upsertResponderProfile(database, userId, input.skills, input.zones, 'available', input.phone, input.preferredContactMethod, now);
    database.exec('COMMIT');
  } catch (error) {
    try { database.exec('ROLLBACK'); } catch { /* transaction may already be closed */ }
    throw error;
  }

  return {
    user: { id: userId, name: input.name, email, role: 'sub_organizer' as const },
    assignment: { id: assignmentId, eventId: input.eventId, responsibility: input.responsibility },
    profile: {
      skills: input.skills,
      zones: input.zones,
      availability: 'available' as const,
      phone: input.phone,
      preferredContactMethod: input.preferredContactMethod,
    },
  };
}
