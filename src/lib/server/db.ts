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
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS events_organizer_idx ON events(organizer_id, start_at);
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
        status TEXT NOT NULL CHECK (status IN ('invited', 'registered', 'cancelled')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(event_id, participant_id)
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
