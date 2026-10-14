import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

type SqliteRow = Record<string, unknown>;
type SqliteStatement = {
  run: (...values: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
  get: (...values: unknown[]) => SqliteRow | undefined;
  all: (...values: unknown[]) => SqliteRow[];
};
export type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatement;
  close: () => void;
};
type SqliteModule = { DatabaseSync: new (filename: string) => SqliteDatabase };

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url || __filename);
const { DatabaseSync } = require('node:sqlite') as SqliteModule;

const databasePath = process.env.RUNSHOW_DB_PATH || join(process.cwd(), '.data', 'runshow.sqlite');
const globalDatabase = globalThis as typeof globalThis & { __runshowDatabase?: SqliteDatabase };

/** Additive, repeatable upgrade for responder profiles created before contact fields existed. */
export function migrateResponderProfileContactColumns(instance: SqliteDatabase) {
  const hasTable = instance.prepare("SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name=?").get('responder_profiles');
  if (!hasTable) throw new Error('Cannot migrate responder contact fields: responder_profiles does not exist.');

  instance.exec('BEGIN IMMEDIATE');
  try {
    const columns = new Set(instance.prepare('PRAGMA table_info(responder_profiles)').all().map(row => String(row.name)));
    if (!columns.has('phone')) instance.exec('ALTER TABLE responder_profiles ADD COLUMN phone TEXT');
    if (!columns.has('preferred_contact_method')) instance.exec('ALTER TABLE responder_profiles ADD COLUMN preferred_contact_method TEXT');
    instance.exec('COMMIT');
  } catch (error) {
    try { instance.exec('ROLLBACK'); } catch { /* transaction may already be closed */ }
    throw error;
  }
}

export function initDbSchema(instance: SqliteDatabase) {
  instance.exec('PRAGMA foreign_keys = ON;');
  instance.exec(`
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
        created_by TEXT REFERENCES users(id),
        assigned_at TEXT,
        completed_at TEXT,
        related_incident_id TEXT REFERENCES incidents(id),
        request_key TEXT,
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
      CREATE TABLE IF NOT EXISTS partners (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        tier TEXT NOT NULL CHECK (tier IN ('Platinum', 'Gold', 'Silver', 'Bronze')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending')),
        contact TEXT NOT NULL DEFAULT '',
        deadline TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS partners_event_idx ON partners(event_id, status);

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
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        registration_id TEXT NOT NULL UNIQUE REFERENCES registrations(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        participant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ticket_number TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
        issued_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tickets_participant_event ON tickets(participant_id, event_id);
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
        resolved_at TEXT,
        escalated_at TEXT
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
        request_key TEXT,
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

      CREATE TABLE IF NOT EXISTS responder_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        skills TEXT NOT NULL DEFAULT 'operations',
        zones TEXT NOT NULL DEFAULT 'all',
        availability TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'busy', 'offline')),
        phone TEXT,
        preferred_contact_method TEXT CHECK (preferred_contact_method IS NULL OR preferred_contact_method IN ('email', 'phone', 'sms')),
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS responder_capabilities (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category TEXT NOT NULL CHECK (category IN ('registration_checkin', 'venue_stage', 'transport_logistics', 'safety_emergency', 'participant_support', 'technical_av', 'volunteer_coordination', 'sponsor_partners', 'communications_outreach', 'scheduling_programme')),
        name TEXT NOT NULL,
        proficiency TEXT NOT NULL CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
        experience_years REAL CHECK (experience_years IS NULL OR experience_years >= 0 AND experience_years <= 80),
        description TEXT NOT NULL DEFAULT '',
        verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        verified_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(event_id, user_id, category, name),
        CHECK ((verified_by IS NULL AND verified_at IS NULL) OR (verified_by IS NOT NULL AND verified_at IS NOT NULL))
      );
      CREATE INDEX IF NOT EXISTS responder_capabilities_event_member_idx ON responder_capabilities(event_id, user_id, category);
      CREATE TABLE IF NOT EXISTS responder_capability_audit (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        capability_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_id TEXT NOT NULL REFERENCES users(id),
        action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'verified', 'unverified')),
        old_values TEXT,
        new_values TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS responder_capability_audit_event_idx ON responder_capability_audit(event_id, user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        reference_number TEXT NOT NULL UNIQUE,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        reporter_id TEXT NOT NULL REFERENCES users(id),
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        zone TEXT,
        affected_session_id TEXT REFERENCES event_sessions(id) ON DELETE SET NULL,
        urgency TEXT NOT NULL CHECK (urgency IN ('critical', 'high', 'medium', 'low')),
        contact_preference TEXT,
        priority_score INTEGER NOT NULL DEFAULT 50,
        priority_reason TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'assigned', 'in_progress', 'waiting_external', 'resolved', 'reopened', 'closed')),
        assigned_responder_id TEXT REFERENCES users(id),
        assigned_at TEXT,
        acknowledged_at TEXT,
        resolution_notes TEXT,
        resolved_at TEXT,
        closed_at TEXT,
        related_risk_id TEXT REFERENCES risks(id) ON DELETE SET NULL,
        related_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS incidents_event_status_idx ON incidents(event_id, status);
      CREATE INDEX IF NOT EXISTS incidents_responder_idx ON incidents(assigned_responder_id, status);
      CREATE INDEX IF NOT EXISTS incidents_reporter_idx ON incidents(reporter_id);

      CREATE TABLE IF NOT EXISTS incident_messages (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES users(id),
        message TEXT NOT NULL,
        is_internal INTEGER NOT NULL DEFAULT 0,
        request_key TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS incident_messages_inc_idx ON incident_messages(incident_id, created_at);

      CREATE TABLE IF NOT EXISTS incident_activities (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        actor_id TEXT NOT NULL REFERENCES users(id),
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        request_key TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS incident_activities_inc_idx ON incident_activities(incident_id, created_at);

      CREATE TABLE IF NOT EXISTS incident_assignments (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        responder_id TEXT NOT NULL REFERENCES users(id),
        assigned_by TEXT NOT NULL REFERENCES users(id),
        reason TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'acknowledged', 'reassigned', 'released')),
        assigned_at TEXT NOT NULL,
        acknowledged_at TEXT
      );
      CREATE INDEX IF NOT EXISTS incident_assignments_inc_idx ON incident_assignments(incident_id, assigned_at);

      CREATE TABLE IF NOT EXISTS in_app_notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
        incident_id TEXT REFERENCES incidents(id) ON DELETE CASCADE,
        task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
        risk_id TEXT REFERENCES risks(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        source_key TEXT
      );
      CREATE INDEX IF NOT EXISTS notifications_user_idx ON in_app_notifications(user_id, read, created_at);

      CREATE TABLE IF NOT EXISTS task_comments (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        request_key TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS task_comments_task_idx ON task_comments(task_id, created_at);
      CREATE TABLE IF NOT EXISTS task_activities (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        actor_id TEXT NOT NULL REFERENCES users(id),
        action TEXT NOT NULL CHECK (action IN ('created','assigned','reassigned','status_changed','progress_update','assistance_requested','blocked','completed','reopened')),
        details TEXT NOT NULL DEFAULT '',
        from_status TEXT,
        to_status TEXT,
        request_key TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS task_activities_task_idx ON task_activities(task_id, created_at);
      CREATE UNIQUE INDEX IF NOT EXISTS task_activities_request_unique ON task_activities(task_id,actor_id,request_key) WHERE request_key IS NOT NULL;
      CREATE TABLE IF NOT EXISTS personal_todos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL CHECK (length(trim(title)) > 0),
        is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        CHECK ((is_completed = 1 AND completed_at IS NOT NULL) OR (is_completed = 0 AND completed_at IS NULL))
      );
      CREATE INDEX IF NOT EXISTS personal_todos_owner_sort_idx
        ON personal_todos(user_id, is_completed, created_at DESC, id);
    `);

  // Idempotent migrations for databases created before newer columns existed.
  // Checking the schema first avoids masking errors unrelated to duplicate columns.
  const ensureColumn = (table: string, column: string, definition: string) => {
    const exists = instance.prepare(`PRAGMA table_info(${table})`).all().some(row => row.name === column);
    if (!exists) instance.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  };
  ensureColumn('task_comments', 'request_key', 'request_key TEXT');
  ensureColumn('in_app_notifications', 'source_key', 'source_key TEXT');
  instance.exec('CREATE UNIQUE INDEX IF NOT EXISTS notifications_source_key_unique ON in_app_notifications(user_id,source_key) WHERE source_key IS NOT NULL');
  ensureColumn('tasks', 'created_by', 'created_by TEXT REFERENCES users(id)');
  ensureColumn('tasks', 'assigned_at', 'assigned_at TEXT');
  ensureColumn('tasks', 'completed_at', 'completed_at TEXT');
  ensureColumn('tasks', 'related_incident_id', 'related_incident_id TEXT REFERENCES incidents(id)');
  ensureColumn('tasks', 'request_key', 'request_key TEXT');
  instance.exec(`CREATE TABLE IF NOT EXISTS task_activities (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL REFERENCES users(id),
    action TEXT NOT NULL CHECK (action IN ('created','assigned','reassigned','status_changed','progress_update','assistance_requested','blocked','completed','reopened')),
    details TEXT NOT NULL DEFAULT '', from_status TEXT, to_status TEXT, request_key TEXT, created_at TEXT NOT NULL
  )`);
  instance.exec('CREATE INDEX IF NOT EXISTS task_activities_task_idx ON task_activities(task_id, created_at)');
  instance.exec('CREATE UNIQUE INDEX IF NOT EXISTS task_activities_request_unique ON task_activities(task_id,actor_id,request_key) WHERE request_key IS NOT NULL');
  instance.exec('CREATE UNIQUE INDEX IF NOT EXISTS tasks_creator_request_unique ON tasks(created_by,request_key) WHERE created_by IS NOT NULL AND request_key IS NOT NULL');
  instance.exec('CREATE UNIQUE INDEX IF NOT EXISTS tasks_related_incident_unique ON tasks(event_id,related_incident_id) WHERE related_incident_id IS NOT NULL');
  ensureColumn('team_assignments', 'permissions_json', "permissions_json TEXT NOT NULL DEFAULT '[]'");
  ensureColumn('team_assignments', 'zones', 'zones TEXT');
  instance.exec('CREATE UNIQUE INDEX IF NOT EXISTS task_comments_request_key_unique ON task_comments(task_id,user_id,request_key) WHERE request_key IS NOT NULL');
  ensureColumn('support_tickets', 'escalated_at', 'escalated_at TEXT');
  ensureColumn('support_messages', 'request_key', 'request_key TEXT');
  instance.exec('CREATE UNIQUE INDEX IF NOT EXISTS support_messages_request_key_unique ON support_messages(ticket_id,sender_id,request_key) WHERE request_key IS NOT NULL');
  ensureColumn('incident_messages', 'request_key', 'request_key TEXT');
  instance.exec('CREATE UNIQUE INDEX IF NOT EXISTS incident_messages_request_key_unique ON incident_messages(incident_id,sender_id,request_key) WHERE request_key IS NOT NULL');
  ensureColumn('incident_activities', 'request_key', 'request_key TEXT');
  instance.exec('CREATE UNIQUE INDEX IF NOT EXISTS incident_activities_request_key_unique ON incident_activities(incident_id,actor_id,request_key) WHERE request_key IS NOT NULL');

  // Ensure invitations table exists
  instance.exec(`
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
  `);

  // Separate, role-specific invitation records prevent participant join tokens
  // from ever being interpreted as team membership credentials.
  instance.exec(`
    CREATE TABLE IF NOT EXISTS team_invitations (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      organizer_id TEXT NOT NULL REFERENCES users(id),
      token_hash TEXT NOT NULL UNIQUE,
      intended_email TEXT,
      responsibility TEXT NOT NULL,
      responsibilities_json TEXT NOT NULL DEFAULT '[]',
      zones TEXT,
      requires_approval INTEGER NOT NULL DEFAULT 0 CHECK(requires_approval IN (0,1)),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','pending_approval','declined','expired','revoked')),
      accepted_by TEXT REFERENCES users(id),
      accepted_at TEXT,
      revoked_by TEXT REFERENCES users(id),
      revoked_at TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS team_invitations_event_idx ON team_invitations(event_id,status,created_at DESC);
    CREATE INDEX IF NOT EXISTS team_invitations_expiry_idx ON team_invitations(expires_at,status);
  `);

  // Events additions
  ensureColumn('events', 'joining_enabled', 'joining_enabled INTEGER NOT NULL DEFAULT 1');
  ensureColumn('events', 'invitation_access_mode', "invitation_access_mode TEXT NOT NULL DEFAULT 'both'");
  ensureColumn('events', 'require_approval', 'require_approval INTEGER NOT NULL DEFAULT 0');
  ensureColumn('events', 'eligibility_requirements', 'eligibility_requirements TEXT');
  ensureColumn('events', 'registration_deadline', 'registration_deadline TEXT');
  migrateResponderProfileContactColumns(instance);
  ensureColumn('events', 'visibility', "visibility TEXT NOT NULL DEFAULT 'private'");
  ensureColumn('events', 'current_registrations', 'current_registrations INTEGER NOT NULL DEFAULT 0');
  instance.exec('CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(visibility)');

  // Invitations additions
  ensureColumn('invitations', 'token_hash', 'token_hash TEXT');
  ensureColumn('invitations', 'access_mode', "access_mode TEXT NOT NULL DEFAULT 'both'");
  ensureColumn('invitations', 'require_approval', 'require_approval INTEGER NOT NULL DEFAULT 0');
  ensureColumn('invitations', 'outreach_source', 'outreach_source TEXT');
  ensureColumn('invitations', 'campaign_name', 'campaign_name TEXT');

  // Registrations additions
  ensureColumn('registrations', 'invitation_id', 'invitation_id TEXT REFERENCES invitations(id)');
  ensureColumn('registrations', 'invitation_code', 'invitation_code TEXT');
  ensureColumn('registrations', 'ticket_option_id', 'ticket_option_id TEXT');
  ensureColumn('registrations', 'payment_status', "payment_status TEXT NOT NULL DEFAULT 'not_applicable'");
  ensureColumn('registrations', 'reference_number', 'reference_number TEXT');
  ensureColumn('registrations', 'cancelled_at', 'cancelled_at TEXT');
  ensureColumn('registrations', 'checked_in_at', 'checked_in_at TEXT');

  // Event intelligence is additive and keeps historical records intact.
  ensureColumn('tasks', 'related_recommendation_id', 'related_recommendation_id TEXT');
  instance.exec(`
    CREATE TABLE IF NOT EXISTS event_metric_snapshots (
      id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      snapshot_day TEXT NOT NULL, taken_at TEXT NOT NULL, metrics_json TEXT NOT NULL,
      UNIQUE(event_id, snapshot_day)
    );
    CREATE INDEX IF NOT EXISTS event_metric_snapshots_event_day_idx ON event_metric_snapshots(event_id, snapshot_day);
    CREATE TABLE IF NOT EXISTS event_intelligence_analyses (
      id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      generated_at TEXT NOT NULL, expires_at TEXT NOT NULL, model TEXT NOT NULL,
      analysis_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS event_intelligence_latest_idx ON event_intelligence_analyses(event_id, generated_at DESC);
    CREATE TABLE IF NOT EXISTS event_intelligence_recommendations (
      id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      category TEXT NOT NULL, priority TEXT NOT NULL, evidence_json TEXT NOT NULL,
      explanation TEXT NOT NULL, action TEXT NOT NULL, expected_outcome TEXT NOT NULL,
      related_task_id TEXT, related_incident_id TEXT, source TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','accepted','in_progress','completed','dismissed')),
      created_at TEXT NOT NULL, valid_until TEXT
    );
    CREATE INDEX IF NOT EXISTS event_intelligence_recs_event_idx ON event_intelligence_recommendations(event_id, status, created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS tasks_related_recommendation_unique ON tasks(related_recommendation_id) WHERE related_recommendation_id IS NOT NULL;
    CREATE TABLE IF NOT EXISTS event_recommendation_history (
      id TEXT PRIMARY KEY, recommendation_id TEXT NOT NULL REFERENCES event_intelligence_recommendations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id), from_status TEXT NOT NULL, to_status TEXT NOT NULL,
      outcome TEXT, created_at TEXT NOT NULL
    );
  `);
}

function database(): SqliteDatabase {
  if (!globalDatabase.__runshowDatabase) {
    mkdirSync(dirname(databasePath), { recursive: true });
    const instance = new DatabaseSync(databasePath);
    initDbSchema(instance);
    globalDatabase.__runshowDatabase = instance;
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
