import type { SqliteDatabase } from './db.ts';
import { CAPABILITY_CATEGORIES, type TeamCapability, type ValidatedCapability } from '../team-capabilities.ts';
import { id } from './db.ts';

function readCapabilities(database: SqliteDatabase, eventId: string, userId: string): TeamCapability[] {
  return database.prepare(`
    SELECT * FROM responder_capabilities
    WHERE event_id=? AND user_id=? ORDER BY category, name
  `).all(eventId, userId).map(row => ({
    id: String(row.id), eventId: String(row.event_id), userId: String(row.user_id),
    category: String(row.category) as TeamCapability['category'], name: String(row.name),
    proficiency: String(row.proficiency) as TeamCapability['proficiency'],
    experienceYears: row.experience_years == null ? null : Number(row.experience_years),
    description: String(row.description || ''), verified: row.verified_at != null,
    verifiedBy: row.verified_by ? String(row.verified_by) : undefined,
    verifiedAt: row.verified_at ? String(row.verified_at) : undefined,
  }));
}

function median(values: number[]): number | null {
  if (values.length < 3) return null;
  values.sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  return Math.round(values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2);
}

export function upsertResponderProfile(
  database: SqliteDatabase,
  userId: string,
  skills: string,
  zones: string,
  availability: string,
  phone: string | null,
  preferredContactMethod: string | null,
  updatedAt: string,
) {
  database.prepare(`
    INSERT INTO responder_profiles(user_id,skills,zones,availability,phone,preferred_contact_method,updated_at)
    VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET skills=excluded.skills,zones=excluded.zones,
      availability=excluded.availability,phone=excluded.phone,
      preferred_contact_method=excluded.preferred_contact_method,updated_at=excluded.updated_at
  `).run(userId, skills, zones, availability, phone, preferredContactMethod, updatedAt);
}

function performanceFor(database: SqliteDatabase, eventId: string, userId: string, now: string) {
  const incidentsAssigned = Number(database.prepare(`
    SELECT COUNT(DISTINCT ia.incident_id) AS count
    FROM incident_assignments ia JOIN incidents i ON i.id=ia.incident_id
    WHERE i.event_id=? AND ia.responder_id=?
  `).get(eventId, userId)?.count ?? 0);
  const incidentsResolved = Number(database.prepare(`
    SELECT COUNT(DISTINCT i.id) AS count
    FROM incidents i
    JOIN (SELECT incident_id, MAX(created_at) AS resolved_at FROM incident_activities
      WHERE action IN ('resolved','closed','status_resolved','status_closed') GROUP BY incident_id) latest ON latest.incident_id=i.id
    JOIN incident_activities a ON a.incident_id=i.id AND a.created_at=latest.resolved_at
      AND a.action IN ('resolved','closed','status_resolved','status_closed')
    WHERE i.event_id=? AND a.actor_id=? AND i.status IN ('resolved','closed')
  `).get(eventId, userId)?.count ?? 0);
  const openIncidents = Number(database.prepare(`
    SELECT COUNT(*) AS count FROM incidents
    WHERE event_id=? AND assigned_responder_id=? AND status NOT IN ('resolved','closed')
  `).get(eventId, userId)?.count ?? 0);
  const tasksCompleted = Number(database.prepare(`
    SELECT COUNT(*) AS count FROM tasks WHERE event_id=? AND owner_id=? AND status='completed'
  `).get(eventId, userId)?.count ?? 0);
  const tasksOverdue = Number(database.prepare(`
    SELECT COUNT(*) AS count FROM tasks
    WHERE event_id=? AND owner_id=? AND status<>'completed' AND due_at<>'' AND due_at<?
  `).get(eventId, userId, now)?.count ?? 0);
  const tasksActive = Number(database.prepare(`
    SELECT COUNT(*) AS count FROM tasks WHERE event_id=? AND owner_id=? AND status<>'completed'
  `).get(eventId, userId)?.count ?? 0);
  const resolutionDurations = database.prepare(`
    SELECT i.created_at AS created_at, latest.resolved_at
    FROM incidents i
    JOIN (SELECT incident_id, MAX(created_at) AS resolved_at FROM incident_activities
      WHERE action IN ('resolved','closed','status_resolved','status_closed') GROUP BY incident_id) latest ON latest.incident_id=i.id
    JOIN incident_activities a ON a.incident_id=i.id AND a.created_at=latest.resolved_at
      AND a.action IN ('resolved','closed','status_resolved','status_closed')
    WHERE i.event_id=? AND a.actor_id=? AND i.status IN ('resolved','closed')
  `).all(eventId, userId).map(row => {
    const start = Date.parse(String(row.created_at)); const end = Date.parse(String(row.resolved_at));
    return Number.isFinite(start) && Number.isFinite(end) && end >= start ? Math.round((end - start) / 60_000) : null;
  }).filter((value): value is number => value !== null);
  const recentActivity = database.prepare(`
    SELECT a.action, a.details, a.created_at, i.reference_number, i.title AS incident_title
    FROM incident_activities a JOIN incidents i ON i.id=a.incident_id
    WHERE i.event_id=? AND a.actor_id=? ORDER BY a.created_at DESC LIMIT 5
  `).all(eventId, userId).map(row => ({
    action: String(row.action), details: String(row.details), createdAt: String(row.created_at),
    incidentReference: String(row.reference_number), incidentTitle: String(row.incident_title),
  }));
  const activeIncidents = database.prepare(`
    SELECT id, reference_number, title, category, urgency, status, zone, created_at
    FROM incidents WHERE event_id=? AND assigned_responder_id=? AND status NOT IN ('resolved','closed')
    ORDER BY CASE urgency WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC
    LIMIT 10
  `).all(eventId, userId).map(row => ({
    id: String(row.id), referenceNumber: String(row.reference_number), title: String(row.title),
    category: String(row.category), urgency: String(row.urgency), status: String(row.status),
    zone: row.zone ? String(row.zone) : null, createdAt: String(row.created_at),
  }));
  return {
    incidentsAssigned, incidentsResolved, openIncidents, tasksCompleted, tasksOverdue, tasksActive,
    medianResolutionMinutes: median(resolutionDurations), resolutionSampleSize: resolutionDurations.length,
    recentActivity, activeIncidents,
  };
}

export function listTeamMembers(database: SqliteDatabase, eventId: string, now: string) {
  const rows = database.prepare(`
    SELECT ta.id AS assignment_id, ta.responsibility, ta.status AS assignment_status,
      u.id, u.name, u.email, u.role,
      COALESCE(rp.availability, 'unknown') AS availability,
      COALESCE(rp.skills, '') AS skills, CASE WHEN rp.user_id IS NULL THEN '' ELSE rp.zones END AS zones,
      rp.phone, rp.preferred_contact_method,
      (SELECT COUNT(*) FROM incidents i WHERE i.assigned_responder_id=u.id
        AND i.status NOT IN ('resolved','closed') AND i.event_id=ta.event_id) AS active_incidents
    FROM team_assignments ta JOIN users u ON u.id=ta.user_id
    LEFT JOIN responder_profiles rp ON rp.user_id=u.id
    WHERE ta.event_id=? AND ta.status='active' AND u.status='active' AND u.role IN ('organizer','sub_organizer')
    ORDER BY u.name, ta.responsibility
  `).all(eventId);
  return rows.map(row => {
    const userId = String(row.id);
    const capabilities = readCapabilities(database, eventId, userId);
    return {
      assignment_id: String(row.assignment_id), responsibility: String(row.responsibility),
      assignment_status: String(row.assignment_status), id: userId, name: String(row.name),
      email: String(row.email), role: String(row.role), availability: String(row.availability),
      skills: String(row.skills), zones: String(row.zones), active_incidents: Number(row.active_incidents),
      phone: row.phone ? String(row.phone) : null,
      preferred_contact_method: row.preferred_contact_method ? String(row.preferred_contact_method) : null,
      capabilities, performance: performanceFor(database, eventId, userId, now),
      capabilityCategories: CAPABILITY_CATEGORIES,
    };
  });
}

export function listCapabilities(database: SqliteDatabase, eventId: string, userId: string) {
  return readCapabilities(database, eventId, userId);
}

export function saveMemberCapabilities(
  database: SqliteDatabase,
  eventId: string,
  userId: string,
  actorId: string,
  capabilities: Array<ValidatedCapability & { id?: string }>,
  timestamp: string,
): TeamCapability[] {
  database.exec('BEGIN IMMEDIATE');
  try {
    const current = database.prepare('SELECT * FROM responder_capabilities WHERE event_id=? AND user_id=?').all(eventId, userId);
    const currentById = new Map(current.map(row => [String(row.id), row]));
    const keep = new Set<string>();
    for (const capability of capabilities) {
      const previous = capability.id ? currentById.get(capability.id) : undefined;
      if (capability.id && !previous) throw new Error('INVALID_CAPABILITY_ID');
      const nextValues = { category: capability.category, name: capability.name, proficiency: capability.proficiency, experienceYears: capability.experienceYears, description: capability.description, verified: capability.verified };
      if (previous) {
        const storedId = String(previous.id);
        const oldVerified = previous.verified_at != null;
        const oldValues = JSON.stringify({ category: previous.category, name: previous.name, proficiency: previous.proficiency, experienceYears: previous.experience_years, description: previous.description, verified: oldVerified });
        const newValues = JSON.stringify(nextValues);
        if (oldValues !== newValues) {
          database.prepare(`UPDATE responder_capabilities SET category=?,name=?,proficiency=?,experience_years=?,description=?,verified_by=?,verified_at=?,updated_at=? WHERE id=? AND event_id=? AND user_id=?`)
            .run(capability.category, capability.name, capability.proficiency, capability.experienceYears, capability.description, capability.verified ? actorId : null, capability.verified ? timestamp : null, timestamp, storedId, eventId, userId);
          const action = !oldVerified && capability.verified ? 'verified' : oldVerified && !capability.verified ? 'unverified' : 'updated';
          database.prepare(`INSERT INTO responder_capability_audit(id,event_id,capability_id,user_id,actor_id,action,old_values,new_values,created_at) VALUES(?,?,?,?,?,?,?,?,?)`)
            .run(id('capaudit'), eventId, storedId, userId, actorId, action, oldValues, newValues, timestamp);
        }
        keep.add(storedId);
      } else {
        const newId = id('capability');
        database.prepare(`INSERT INTO responder_capabilities(id,event_id,user_id,category,name,proficiency,experience_years,description,verified_by,verified_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
          .run(newId, eventId, userId, capability.category, capability.name, capability.proficiency, capability.experienceYears, capability.description, capability.verified ? actorId : null, capability.verified ? timestamp : null, timestamp, timestamp);
        database.prepare(`INSERT INTO responder_capability_audit(id,event_id,capability_id,user_id,actor_id,action,new_values,created_at) VALUES(?,?,?,?,?,?,?,?)`)
          .run(id('capaudit'), eventId, newId, userId, actorId, capability.verified ? 'verified' : 'created', JSON.stringify(nextValues), timestamp);
        keep.add(newId);
      }
    }
    for (const [capabilityId, previous] of currentById) {
      if (keep.has(capabilityId)) continue;
      database.prepare(`INSERT INTO responder_capability_audit(id,event_id,capability_id,user_id,actor_id,action,old_values,created_at) VALUES(?,?,?,?,?,?,?,?)`)
        .run(id('capaudit'), eventId, capabilityId, userId, actorId, 'deleted', JSON.stringify({ category: previous.category, name: previous.name, proficiency: previous.proficiency, experienceYears: previous.experience_years, description: previous.description, verified: previous.verified_at != null }), timestamp);
      database.prepare('DELETE FROM responder_capabilities WHERE id=? AND event_id=? AND user_id=?').run(capabilityId, eventId, userId);
    }
    database.exec('COMMIT');
  } catch (error) {
    try { database.exec('ROLLBACK'); } catch { /* transaction may already be closed */ }
    throw error;
  }
  return readCapabilities(database, eventId, userId);
}

export function canReadEventTeam(database: SqliteDatabase, eventId: string, userId: string, role: string): boolean {
  if (role === 'organizer') return Boolean(database.prepare('SELECT id FROM events WHERE id=? AND organizer_id=?').get(eventId, userId));
  if (role !== 'sub_organizer') return false;
  return Boolean(database.prepare("SELECT id FROM team_assignments WHERE event_id=? AND user_id=? AND status='active'").get(eventId, userId));
}

export function canAccessSubOrganizerTask(database: SqliteDatabase, taskId: string, userId: string): boolean {
  return Boolean(database.prepare(`SELECT 1 FROM tasks t JOIN team_assignments ta ON ta.event_id=t.event_id
    JOIN users u ON u.id=ta.user_id WHERE t.id=? AND t.owner_id=? AND ta.user_id=?
    AND ta.status='active' AND u.status='active' AND u.role='sub_organizer'`).get(taskId, userId, userId));
}

export function canAccessSubOrganizerIncident(database: SqliteDatabase, incidentId: string, userId: string): boolean {
  return Boolean(database.prepare(`SELECT 1 FROM incidents i JOIN team_assignments ta ON ta.event_id=i.event_id
    JOIN users u ON u.id=ta.user_id WHERE i.id=? AND i.assigned_responder_id=? AND ta.user_id=?
    AND ta.status='active' AND u.status='active' AND u.role='sub_organizer'`).get(incidentId, userId, userId));
}

export function canAccessSubOrganizerSupportTicket(database: SqliteDatabase, ticketId: string, userId: string): boolean {
  return Boolean(database.prepare(`SELECT 1 FROM support_tickets t JOIN team_assignments ta ON ta.event_id=t.event_id
    JOIN users u ON u.id=ta.user_id WHERE t.id=? AND ta.user_id=? AND ta.status='active'
    AND u.status='active' AND u.role='sub_organizer'`).get(ticketId, userId));
}

export function canManageMemberCapabilities(database: SqliteDatabase, eventId: string, organizerId: string, memberId: string): boolean {
  if (!database.prepare('SELECT id FROM events WHERE id=? AND organizer_id=?').get(eventId, organizerId)) return false;
  return Boolean(database.prepare(`
    SELECT ta.id FROM team_assignments ta JOIN users u ON u.id=ta.user_id
    WHERE ta.event_id=? AND ta.user_id=? AND ta.status='active'
      AND u.role='sub_organizer' AND u.status='active'
  `).get(eventId, memberId));
}

export function canAssignSubOrganizerToEvent(database: SqliteDatabase, eventId: string, userId: string): boolean {
  return Boolean(database.prepare(`
    SELECT u.id FROM users u JOIN team_assignments ta ON ta.user_id=u.id
    WHERE u.id=? AND u.role='sub_organizer' AND u.status='active'
      AND ta.event_id=? AND ta.status='active'
  `).get(userId, eventId));
}
