import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

type SqliteRow = Record<string, unknown>;
type SqliteStatement = {
  run: (...values: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
  get: (...values: unknown[]) => SqliteRow | undefined;
  all: (...values: unknown[]) => SqliteRow[];
};
type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatement;
  close: () => void;
};
type SqliteModule = { DatabaseSync: new (filename: string) => SqliteDatabase };

// Node 24 exposes SQLite as a built-in module. Keeping the import behind require
// lets the client bundle remain free of server-only database code.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as SqliteModule;

const databasePath = process.env.RUNSHOW_DB_PATH || join(process.cwd(), '.data', 'runshow.sqlite');
const globalDatabase = globalThis as typeof globalThis & { __runshowDatabase?: SqliteDatabase };

function database(): SqliteDatabase {
  if (!globalDatabase.__runshowDatabase) {
    mkdirSync(dirname(databasePath), { recursive: true });
    globalDatabase.__runshowDatabase = new DatabaseSync(databasePath);
    globalDatabase.__runshowDatabase.exec('PRAGMA foreign_keys = ON;');
    globalDatabase.__runshowDatabase.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('organizer', 'sub_organizer', 'participant')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
      CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        organizer_id TEXT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        event_type TEXT NOT NULL,
        format TEXT NOT NULL CHECK (format IN ('in-person', 'virtual', 'hybrid')),
        start_at TEXT NOT NULL,
        end_at TEXT NOT NULL,
        timezone TEXT NOT NULL,
        venue TEXT,
        meeting_url TEXT,
        joining_instructions TEXT,
        audience TEXT NOT NULL DEFAULT '',
        expected_attendance INTEGER NOT NULL DEFAULT 0 CHECK (expected_attendance >= 0),
        registration_target INTEGER NOT NULL DEFAULT 0 CHECK (registration_target >= 0),
        capacity INTEGER CHECK (capacity IS NULL OR capacity >= 0),
        lifecycle TEXT NOT NULL DEFAULT 'upcoming' CHECK (lifecycle IN ('draft', 'upcoming', 'in-progress', 'completed', 'cancelled')),
        visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
        ticket_type TEXT CHECK (ticket_type IN ('free', 'paid')),
        ticket_price REAL,
        ticket_currency TEXT DEFAULT 'USD',
        registration_deadline TEXT,
        cancellation_policy TEXT,
        eligibility_requirements TEXT,
        banner_image_url TEXT,
        organizer_institution TEXT,
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS events_organizer_idx ON events(organizer_id, start_at);
      CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(visibility);
      CREATE INDEX IF NOT EXISTS idx_events_lifecycle ON events(lifecycle);
      CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);
      CREATE TABLE IF NOT EXISTS event_sessions (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        start_at TEXT NOT NULL,
        end_at TEXT NOT NULL,
        venue TEXT,
        meeting_url TEXT
      );
      CREATE INDEX IF NOT EXISTS event_sessions_event_idx ON event_sessions(event_id, start_at);
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        priority TEXT NOT NULL CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'blocked')),
        due_at TEXT NOT NULL,
        owner_id TEXT REFERENCES users(id),
        department TEXT,
        related_risk_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS tasks_event_idx ON tasks(event_id, status, due_at);
      CREATE TABLE IF NOT EXISTS team_assignments (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        responsibility TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(event_id, user_id, responsibility)
      );
      CREATE INDEX IF NOT EXISTS team_assignments_user_idx ON team_assignments(user_id, status);
      CREATE TABLE IF NOT EXISTS registrations (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        participant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled', 'waitlisted')),
        ticket_option_id TEXT REFERENCES ticket_options(id),
        invitation_code TEXT,
        payment_status TEXT NOT NULL DEFAULT 'not_applicable' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'not_applicable')),
        reference_number TEXT,
        cancelled_at TEXT,
        checked_in_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(event_id, participant_id)
      );
      CREATE INDEX IF NOT EXISTS idx_registrations_event_participant ON registrations(event_id, participant_id);
      CREATE TABLE IF NOT EXISTS ticket_options (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        type TEXT NOT NULL CHECK (type IN ('free', 'paid')),
        price REAL NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        capacity INTEGER,
        sold_count INTEGER NOT NULL DEFAULT 0,
        sales_start TEXT,
        sales_end TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ticket_options_event ON ticket_options(event_id);
      CREATE TABLE IF NOT EXISTS invitations (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        code TEXT NOT NULL UNIQUE,
        token TEXT NOT NULL UNIQUE,
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL,
        expires_at TEXT,
        max_uses INTEGER,
        used_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'exhausted')),
        revoked_at TEXT,
        revoked_by TEXT REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_invitations_event ON invitations(event_id);
      CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
      CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
      CREATE TABLE IF NOT EXISTS support_tickets (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        participant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('registration', 'payment', 'schedule', 'checkin', 'technical', 'communication', 'other')),
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'waiting_for_participant', 'resolved', 'closed')),
        priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
        assignee_id TEXT REFERENCES users(id),
        reference_number TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        resolved_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_support_tickets_event ON support_tickets(event_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_participant ON support_tickets(participant_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee ON support_tickets(assignee_id);
      CREATE TABLE IF NOT EXISTS support_messages (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sender_role TEXT NOT NULL CHECK (sender_role IN ('participant', 'organizer', 'sub_organizer', 'system')),
        content TEXT NOT NULL,
        is_internal INTEGER NOT NULL DEFAULT 0,
        attachments TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
        read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS risks (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'mitigated', 'closed')),
        evidence TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS recommendations (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        reason TEXT NOT NULL,
        priority TEXT NOT NULL CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }
  return globalDatabase.__runshowDatabase;
}

export function db(): SqliteDatabase { return database(); }
export function nowIso(): string { return new Date().toISOString(); }
export function id(prefix: string): string { return `${prefix}_${randomUUID()}`; }
export function closeDbForTests() {
  globalDatabase.__runshowDatabase?.close();
  delete globalDatabase.__runshowDatabase;
}
