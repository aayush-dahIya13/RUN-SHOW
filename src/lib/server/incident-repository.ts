import { db, id, nowIso } from './db';
import type { SqliteDatabase } from './db';
import type {
  Incident,
  IncidentCategory,
  IncidentUrgency,
  IncidentStatus,
  IncidentMessage,
  IncidentActivity,
  ResponderRecommendation,
  InAppNotification,
} from '@/lib/types';
import { listCapabilities } from './team-repository';
import { suggestResponders } from '../team-capabilities';

export const VALID_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  new: ['acknowledged', 'assigned', 'closed'],
  acknowledged: ['assigned', 'in_progress', 'closed'],
  assigned: ['acknowledged', 'in_progress', 'waiting_external', 'closed'],
  in_progress: ['waiting_external', 'resolved', 'closed'],
  waiting_external: ['in_progress', 'resolved', 'closed'],
  resolved: ['reopened', 'closed'],
  reopened: ['assigned', 'in_progress', 'closed'],
  closed: ['reopened'],
};

export function calculatePriority(input: {
  category: IncidentCategory;
  urgency: IncidentUrgency;
  zone?: string;
  hasAffectedSession: boolean;
  minutesUntilSession?: number;
}): { score: number; reason: string } {
  let score = 30;
  const reasons: string[] = [];

  // Urgency
  if (input.urgency === 'critical') {
    score += 40;
    reasons.push('Marked critical urgency');
  } else if (input.urgency === 'high') {
    score += 25;
    reasons.push('Marked high urgency');
  } else if (input.urgency === 'medium') {
    score += 15;
  }

  // Category
  if (input.category === 'safety') {
    score += 40;
    reasons.push('Safety-sensitive category escalated immediately');
  } else if (input.category === 'transport') {
    score += 20;
    reasons.push('Transport disruption affects participant arrival');
  } else if (input.category === 'venue' || input.category === 'accessibility') {
    score += 15;
    reasons.push('Venue/accessibility operational blocker');
  }

  // Session proximity
  if (input.hasAffectedSession) {
    score += 15;
    reasons.push('Directly impacts scheduled event session');
    if (input.minutesUntilSession !== undefined && input.minutesUntilSession <= 60 && input.minutesUntilSession >= 0) {
      score += 20;
      reasons.push(`Session begins in under ${input.minutesUntilSession} minutes`);
    }
  }

  score = Math.min(100, Math.max(1, score));
  return { score, reason: reasons.join('; ') || 'Standard priority calculation based on submission' };
}

export function createNotification(input: {
  userId: string;
  eventId?: string;
  incidentId?: string;
  taskId?: string;
  riskId?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}): InAppNotification {
  const notifId = id('notif');
  const now = nowIso();
  db()
    .prepare(
      `INSERT INTO in_app_notifications (id, user_id, event_id, incident_id, task_id, risk_id, type, title, message, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .run(
      notifId,
      input.userId,
      input.eventId ?? null,
      input.incidentId ?? null,
      input.taskId ?? null,
      input.riskId ?? null,
      input.type,
      input.title,
      input.message,
      now
    );

  return {
    id: notifId,
    userId: input.userId,
    eventId: input.eventId,
    incidentId: input.incidentId,
    taskId: input.taskId,
    riskId: input.riskId,
    type: input.type,
    title: input.title,
    message: input.message,
    read: false,
    createdAt: now,
  };
}

export function getNotificationsForUser(userId: string): InAppNotification[] {
  const rows = db()
    .prepare('SELECT * FROM in_app_notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50')
    .all(userId);
  return rows.map(r => ({
    id: String(r.id),
    userId: String(r.user_id),
    eventId: r.event_id ? String(r.event_id) : undefined,
    incidentId: r.incident_id ? String(r.incident_id) : undefined,
    taskId: r.task_id ? String(r.task_id) : undefined,
    riskId: r.risk_id ? String(r.risk_id) : undefined,
    type: r.type as InAppNotification['type'],
    title: String(r.title),
    message: String(r.message),
    read: Boolean(r.read),
    createdAt: String(r.created_at),
  }));
}

export function markNotificationRead(notificationId: string, userId: string) {
  db().prepare('UPDATE in_app_notifications SET read=1 WHERE id=? AND user_id=?').run(notificationId, userId);
}

export function markAllNotificationsRead(userId: string) {
  db().prepare('UPDATE in_app_notifications SET read=1 WHERE user_id=?').run(userId);
}

export function getIncidentById(incidentId: string): Incident | null {
  const row = db().prepare(`
    SELECT i.*, u.name as reporter_name, resp.name as assigned_responder_name
    FROM incidents i
    LEFT JOIN users u ON u.id = i.reporter_id
    LEFT JOIN users resp ON resp.id = i.assigned_responder_id
    WHERE i.id=?
  `).get(incidentId);

  if (!row) return null;
  return mapIncidentRow(row);
}

export function listIncidentsForEvent(eventId: string, options?: { responderId?: string; reporterId?: string }): Incident[] {
  let query = `
    SELECT i.*, u.name as reporter_name, resp.name as assigned_responder_name
    FROM incidents i
    LEFT JOIN users u ON u.id = i.reporter_id
    LEFT JOIN users resp ON resp.id = i.assigned_responder_id
    WHERE i.event_id=?
  `;
  const params: unknown[] = [eventId];

  if (options?.responderId) {
    query += ' AND i.assigned_responder_id=?';
    params.push(options.responderId);
  } else if (options?.reporterId) {
    query += ' AND i.reporter_id=?';
    params.push(options.reporterId);
  }

  query += ' ORDER BY i.priority_score DESC, i.created_at DESC';

  const rows = db().prepare(query).all(...params);
  return rows.map(mapIncidentRow);
}

function mapIncidentRow(row: Record<string, unknown>): Incident {
  return {
    id: String(row.id),
    referenceNumber: String(row.reference_number),
    eventId: String(row.event_id),
    reporterId: String(row.reporter_id),
    reporterName: String(row.reporter_name || 'Participant'),
    category: row.category as IncidentCategory,
    title: String(row.title),
    description: String(row.description),
    zone: row.zone ? String(row.zone) : undefined,
    affectedSessionId: row.affected_session_id ? String(row.affected_session_id) : undefined,
    urgency: row.urgency as IncidentUrgency,
    contactPreference: row.contact_preference ? String(row.contact_preference) : undefined,
    priorityScore: Number(row.priority_score),
    priorityReason: String(row.priority_reason),
    status: row.status as IncidentStatus,
    assignedResponderId: row.assigned_responder_id ? String(row.assigned_responder_id) : undefined,
    assignedResponderName: row.assigned_responder_name ? String(row.assigned_responder_name) : undefined,
    assignedAt: row.assigned_at ? String(row.assigned_at) : undefined,
    acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : undefined,
    resolutionNotes: row.resolution_notes ? String(row.resolution_notes) : undefined,
    resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
    closedAt: row.closed_at ? String(row.closed_at) : undefined,
    relatedRiskId: row.related_risk_id ? String(row.related_risk_id) : undefined,
    relatedTaskId: row.related_task_id ? String(row.related_task_id) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function getIncidentMessages(incidentId: string, includeInternal = false): IncidentMessage[] {
  let query = `
    SELECT m.*, u.name as sender_name, u.role as sender_role
    FROM incident_messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.incident_id=?
  `;
  if (!includeInternal) {
    query += ' AND m.is_internal=0';
  }
  query += ' ORDER BY m.created_at ASC';

  const rows = db().prepare(query).all(incidentId);
  return rows.map(r => ({
    id: String(r.id),
    incidentId: String(r.incident_id),
    senderId: String(r.sender_id),
    senderName: String(r.sender_name),
    senderRole: r.sender_role as IncidentMessage['senderRole'],
    message: String(r.message),
    isInternal: Boolean(r.is_internal),
    createdAt: String(r.created_at),
  }));
}

export function getIncidentActivities(incidentId: string): IncidentActivity[] {
  const rows = db()
    .prepare(`
      SELECT a.*, u.name as actor_name
      FROM incident_activities a
      JOIN users u ON u.id = a.actor_id
      WHERE a.incident_id=?
      ORDER BY a.created_at ASC
    `)
    .all(incidentId);

  return rows.map(r => ({
    id: String(r.id),
    incidentId: String(r.incident_id),
    actorId: String(r.actor_id),
    actorName: String(r.actor_name),
    action: String(r.action),
    details: String(r.details),
    createdAt: String(r.created_at),
  }));
}

export function logIncidentActivity(incidentId: string, actorId: string, action: string, details: string, requestKey?: string, database: SqliteDatabase = db()): boolean {
  const actId = id('act');
  const now = nowIso();
  const result = requestKey
    ? database.prepare(`INSERT INTO incident_activities (id, incident_id, actor_id, action, details, request_key, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(incident_id,actor_id,request_key) WHERE request_key IS NOT NULL DO NOTHING`)
      .run(actId, incidentId, actorId, action, details, requestKey, now)
    : database.prepare('INSERT INTO incident_activities (id, incident_id, actor_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(actId, incidentId, actorId, action, details, now);
  return result.changes > 0;
}

export function recommendResponders(eventId: string, incident: { category: IncidentCategory; zone?: string }): ResponderRecommendation[] {
  // Find sub-organizers/organizers assigned to this event
  const teamMembers = db().prepare(`
    SELECT DISTINCT u.id, u.name, u.email, u.role,
           COALESCE(rp.skills, 'operations') as skills,
           COALESCE(rp.zones, 'all') as zones,
           COALESCE(rp.availability, 'available') as availability,
           (SELECT COUNT(*) FROM incidents inc WHERE inc.event_id=? AND inc.assigned_responder_id = u.id AND inc.status NOT IN ('resolved', 'closed')) as active_count
    FROM users u
    JOIN team_assignments ta ON ta.user_id = u.id AND ta.event_id = ? AND ta.status = 'active'
    LEFT JOIN responder_profiles rp ON rp.user_id = u.id
    WHERE u.role IN ('sub_organizer', 'organizer') AND u.status = 'active'
  `).all(eventId, eventId);

  const ranked = suggestResponders(teamMembers.map(row => ({
    id: String(row.id), name: String(row.name), availability: String(row.availability),
    zones: String(row.zones).split(',').map(value => value.trim()).filter(Boolean),
    activeIncidents: Number(row.active_count),
    activeTasks: Number(db().prepare("SELECT COUNT(*) AS count FROM tasks WHERE event_id=? AND owner_id=? AND status<>'completed'").get(eventId, String(row.id))?.count ?? 0),
    capabilities: listCapabilities(db(), eventId, String(row.id)),
    legacySkills: String(row.skills).split(',').map(value => value.trim()).filter(Boolean),
  })), incident.category, incident.zone);
  return ranked.map(item => ({
    responderId: item.id,
    name: item.name,
    email: String(teamMembers.find(row => String(row.id) === item.id)?.email || ''),
    skills: String(teamMembers.find(row => String(row.id) === item.id)?.skills || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean),
    zones: item.zones.map(value => value.toLowerCase()),
    availability: item.availability,
    activeIncidentsCount: item.activeIncidents,
    score: Math.max(0, item.score),
    reason: item.reason,
  }));
}
