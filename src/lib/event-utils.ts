import { addDays, endOfDay, isValid, parseISO, startOfDay } from 'date-fns';
import { Event, EventSession } from './types';

export type EventStatus = 'past' | 'active' | 'upcoming' | 'unscheduled';

function parseEventDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function eventStart(event: Event): Date | null {
  return parseEventDate(event.startDate || event.date);
}

export function eventEnd(event: Event): Date | null {
  return parseEventDate(event.endDate || event.startDate || event.date);
}

export function getEventStatus(event: Event, now = new Date()): EventStatus {
  const start = eventStart(event);
  const end = eventEnd(event);
  if (!start || !end || end < start) return 'unscheduled';
  if (now < startOfDay(start)) return 'upcoming';
  if (now <= endOfDay(end)) return 'active';
  return 'past';
}

export function getNextUpcomingEvent(events: Event[], now = new Date()): Event | undefined {
  return events
    .filter(event => getEventStatus(event, now) === 'upcoming')
    .sort((a, b) => (eventStart(a)?.getTime() ?? 0) - (eventStart(b)?.getTime() ?? 0))[0];
}

export function isTaskOverdue(deadline: string, status: string, now = new Date()): boolean {
  if (status === 'completed') return false;
  const date = parseEventDate(deadline);
  return !!date && now > endOfDay(date);
}

export function demoCalendarEvents(today = new Date()): Event[] {
  const day = startOfDay(today);
  const past = addDays(day, -12);
  const activeStart = addDays(day, -1);
  const activeEnd = addDays(day, 1);
  const asDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const sessions = (eventId: string, date: string, venue: string): EventSession[] => [
    { id: `${eventId}-checkin`, name: 'Check-in and Welcome', date, startTime: '09:00', endTime: '09:45', venue, description: 'Participant check-in and event orientation.', functionName: 'Orientation' },
    { id: `${eventId}-main`, name: 'Main Programme', date, startTime: '10:00', endTime: '16:30', venue, description: 'Talks, activities, and scheduled breaks.', functionName: 'Speaker Coordination' },
  ];

  return [
    {
      id: 'runshow-demo-past', name: 'RUNSHOW Demo: Community Showcase', type: 'Community showcase',
      date: asDate(past), startDate: asDate(past), endDate: asDate(addDays(past, 1)),
      targetRegistrations: 160, currentRegistrations: 148, partnerConfirmations: 3, totalPartners: 3,
      participantCapacity: 180,
      venueConfirmed: true, daysRemaining: 0, format: 'in-person', venue: 'Civic Hall, Demo City', isDemo: true,
      sessions: sessions('runshow-demo-past', asDate(past), 'Civic Hall, Demo City'), participantInstructions: 'Demo schedule only. Check-in is at the main entrance.',
    },
    {
      id: 'runshow-demo-active', name: 'RUNSHOW Demo: Product Summit', type: 'Product summit',
      date: asDate(activeStart), startDate: asDate(activeStart), endDate: asDate(activeEnd),
      targetRegistrations: 240, currentRegistrations: 198, partnerConfirmations: 4, totalPartners: 5,
      participantCapacity: 260,
      venueConfirmed: true, daysRemaining: 0, format: 'hybrid', venue: 'Innovation Centre, Demo City', isDemo: true,
      sessions: sessions('runshow-demo-active', asDate(day), 'Innovation Centre, Demo City'), participantInstructions: 'Demo schedule only. Online participants can join using the event link shared by the organizer.',
    },
  ];
}
