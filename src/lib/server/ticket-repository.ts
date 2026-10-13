import { randomBytes } from 'node:crypto';
import { db, id } from './db';

export interface TicketRecord {
  id: string;
  registration_id: string;
  event_id: string;
  participant_id: string;
  ticket_number: string;
  status: 'active' | 'cancelled';
  issued_at: string;
}

export function issueTicket(registrationId: string, eventId: string, participantId: string, issuedAt: string): TicketRecord {
  const database = db();
  const existing = database.prepare('SELECT * FROM tickets WHERE registration_id = ?').get(registrationId) as TicketRecord | undefined;
  if (existing) return existing;

  const ticketNumber = `TKT-${randomBytes(7).toString('hex').toUpperCase()}`;
  database.prepare(`
    INSERT INTO tickets(id, registration_id, event_id, participant_id, ticket_number, status, issued_at)
    VALUES(?,?,?,?,?,?,?)
  `).run(id('tkt'), registrationId, eventId, participantId, ticketNumber, 'active', issuedAt);
  return database.prepare('SELECT * FROM tickets WHERE registration_id = ?').get(registrationId) as unknown as TicketRecord;
}

export function ticketForRegistration(registrationId: string): TicketRecord | undefined {
  return db().prepare('SELECT * FROM tickets WHERE registration_id = ? AND status = \'active\'').get(registrationId) as TicketRecord | undefined;
}
