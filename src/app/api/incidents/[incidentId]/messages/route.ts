import { NextRequest, NextResponse } from 'next/server';
import { db, id, nowIso } from '@/lib/server/db';
import { currentUser } from '@/lib/server/auth';
import { jsonError, requireRole } from '@/lib/server/http';
import {
  getIncidentById,
  getIncidentMessages,
  logIncidentActivity,
  createNotification,
} from '@/lib/server/incident-repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  const user = await currentUser();
  const authError = requireRole(user, ['organizer', 'sub_organizer', 'participant']);
  if (authError) return authError;
  const { incidentId } = await params;

  const incident = getIncidentById(incidentId);
  if (!incident) return jsonError('Incident not found.', 404, 'NOT_FOUND');

  if (user!.role === 'participant' && incident.reporterId !== user!.id) {
    return jsonError('Access denied.', 403, 'FORBIDDEN');
  }

  const isInternalViewer = user!.role === 'organizer' || user!.role === 'sub_organizer';
  const messages = getIncidentMessages(incidentId, isInternalViewer);
  return NextResponse.json(messages);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  const user = await currentUser();
  const authError = requireRole(user, ['organizer', 'sub_organizer', 'participant']);
  if (authError) return authError;
  const { incidentId } = await params;

  const incident = getIncidentById(incidentId);
  if (!incident) return jsonError('Incident not found.', 404, 'NOT_FOUND');

  if (user!.role === 'participant' && incident.reporterId !== user!.id) {
    return jsonError('You can only message on your own incidents.', 403, 'FORBIDDEN');
  }

  const body = await request.json().catch(() => ({}));
  const message = String(body.message || '').trim();
  const isInternal = Boolean(body.isInternal);

  if (!message) {
    return jsonError('Message content cannot be empty.', 400, 'VALIDATION_ERROR');
  }

  // Participants cannot post internal notes
  if (user!.role === 'participant' && isInternal) {
    return jsonError('Participants cannot post internal notes.', 403, 'FORBIDDEN');
  }

  const msgId = id('msg');
  const now = nowIso();

  db().prepare(`
    INSERT INTO incident_messages (id, incident_id, sender_id, message, is_internal, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(msgId, incidentId, user!.id, message, isInternal ? 1 : 0, now);

  logIncidentActivity(
    incidentId,
    user!.id,
    'message_added',
    `${user!.name} posted a ${isInternal ? 'private team note' : 'status message'}`
  );

  // If this is a participant-visible message from staff, notify the participant!
  if (!isInternal && user!.id !== incident.reporterId) {
    createNotification({
      userId: incident.reporterId,
      eventId: incident.eventId,
      incidentId,
      type: 'info',
      title: `Update on Incident ${incident.referenceNumber}`,
      message: `${user!.name}: ${message}`,
    });
  }

  // If this is a message from participant, notify responder and organizer
  if (user!.role === 'participant') {
    if (incident.assignedResponderId) {
      createNotification({
        userId: incident.assignedResponderId,
        eventId: incident.eventId,
        incidentId,
        type: 'info',
        title: `Participant Update on ${incident.referenceNumber}`,
        message: `${user!.name}: ${message}`,
      });
    }
  }

  return NextResponse.json({
    id: msgId,
    incidentId,
    senderId: user!.id,
    senderName: user!.name,
    senderRole: user!.role,
    message,
    isInternal,
    createdAt: now,
  }, { status: 201 });
}
