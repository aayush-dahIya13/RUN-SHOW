'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, MonitorPlay, Users, RadioTower, TicketCheck, ShieldCheck, ClipboardList } from 'lucide-react';
import { format, isValid, parseISO, differenceInDays } from 'date-fns';
import { isUsingServerAuth, useDemoSession } from '@/lib/demo-auth';
import { useDashboardStore } from '@/lib/dashboard-state';
import { getEventStatus } from '@/lib/event-utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const eventStatusNames = { past: 'Past', active: 'In progress', upcoming: 'Upcoming', unscheduled: 'Dates pending' };
const eventStatusBadgeVariants = { past: 'neutral' as const, active: 'success' as const, upcoming: 'warning' as const, unscheduled: 'secondary' as const };

export function ParticipantEventsView() {
  const session = useDemoSession();
  const { events, participantEvents, announcements } = useDashboardStore();
  const [serverEvents, setServerEvents] = useState<typeof events>([]);
  const [serverLinks, setServerLinks] = useState<typeof participantEvents>([]);
  useEffect(() => {
    if (!isUsingServerAuth() || !session) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/events', { credentials: 'include' });
        if (!response.ok) throw new Error('Unable to load your events.');
        const loadedEvents = await response.json();
        const registrations = await Promise.all((loadedEvents as Array<{ id: string }>).map(async item => {
          const registrationResponse = await fetch(`/api/events/${item.id}/registration`, { credentials: 'include' });
          if (!registrationResponse.ok) return null;
          const payload = await registrationResponse.json();
          return payload.registration ? { eventId: item.id, registration: payload.registration, ticket: payload.ticket } : null;
        }));
        if (cancelled) return;
        setServerEvents(loadedEvents);
        setServerLinks(registrations.filter(Boolean).map(item => ({
          accountId: session.id,
          eventId: item!.eventId,
          registrationStatus: item!.registration.status === 'confirmed' ? 'registered' : 'invited',
          createdAt: item!.registration.registeredAt,
          referenceNumber: item!.registration.referenceNumber,
          ticketNumber: item!.ticket?.ticketNumber,
        })));
      } catch {
        if (!cancelled) { setServerEvents([]); setServerLinks([]); }
      }
    })();
    return () => { cancelled = true; };
  }, [session]);
  const activeEvents = isUsingServerAuth() ? serverEvents : events;
  const links = isUsingServerAuth() ? serverLinks : participantEvents.filter(link => link.accountId === session?.id);
  const myEvents = links.map(link => ({ link, event: activeEvents.find(item => item.id === link.eventId) })).filter((item): item is { link: typeof links[number]; event: NonNullable<typeof item.event> } => !!item.event);
  const [selectedEventId, setSelectedEventId] = useState('');

  const selected = myEvents.find(item => item.event.id === selectedEventId) ?? myEvents[0];
  const event = selected?.event;
  const registrationStatus = selected?.link.registrationStatus;
  const sessions = [...(event?.sessions ?? [])].filter(item => isValid(parseISO(item.date))).sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  const eventAnnouncements = announcements.filter(item => item.eventId === event?.id);
  const nextSession = sessions.find(item => differenceInDays(parseISO(item.date), new Date()) >= 0);

  if (!myEvents.length) {
    return (
      <Card padding="lg" className="text-center">
        <RadioTower className="mx-auto h-12 w-12 text-[var(--text-muted)]" aria-hidden="true" />
        <h2 className="mt-4 font-semibold text-[var(--text-primary)]">No events are linked to this account</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">An event organizer must associate an event with your participant account.</p>
        <p className="mt-4 text-xs text-[var(--text-muted)]">Contact your event organizer to request access.</p>
      </Card>
    );
  }

  if (!event) return null;

  return (
    <div className="space-y-6">
      {/* Event Selector */}
      {myEvents.length > 1 && (
        <div className="flex flex-wrap gap-2" aria-label="Choose event">
          {myEvents.map(item => (
            <Button
              key={item.event.id}
              type="button"
              variant={item.event.id === event.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedEventId(item.event.id)}
            >
              {item.event.name}
            </Button>
          ))}
        </div>
      )}

      {/* Event Hero Card */}
      <Card variant="elevated" padding="lg" className="border border-[var(--border)]">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">{event.name}</h2>
              {event.isDemo && <Badge variant="secondary" className="text-xs">Demo data</Badge>}
              <Badge variant={eventStatusBadgeVariants[getEventStatus(event)]} className="text-xs">{eventStatusNames[getEventStatus(event)]}</Badge>
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{event.type || 'Event'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />{dateRange(event.startDate || event.date, event.endDate)}</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{event.venue || 'Venue details pending'}</span>
              <span className="flex items-center gap-1.5"><MonitorPlay className="h-4 w-4" aria-hidden="true" />{event.format || 'Not specified'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('runshow:workspace-tab', { detail: { tab: 'schedule' } }))}>
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              <span>View Schedule</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('runshow:workspace-tab', { detail: { tab: 'venue' } }))}>
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span>Venue Details</span>
            </Button>
          </div>
        </div>

        {/* Registration Info */}
        <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-sm font-medium text-[var(--text-primary)]">Your Registration</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <TicketCheck className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Status</p>
                <p className="font-medium text-[var(--text-primary)]">{registrationStatus ? registrationStatusLabel(registrationStatus) : 'No registration record available'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Reference ID</p>
                <p className="font-medium text-[var(--text-primary)] font-mono text-sm">{selected?.link.referenceNumber || 'Pending'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Registered</p>
                <p className="font-medium text-[var(--text-primary)]">{selected?.link.createdAt && isValid(parseISO(selected.link.createdAt)) ? format(parseISO(selected.link.createdAt), 'MMM d, yyyy') : 'Date not available'}</p>
              </div>
            </div>
          </div>
        </div>

        {selected?.link.ticketNumber && registrationStatus === 'registered' && (
          <div className="mt-4 rounded-lg border border-[var(--action-primary)]/50 bg-[var(--success-surface)] p-4">
            <div className="flex items-center gap-3"><TicketCheck className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" /><div><p className="text-xs uppercase tracking-wide text-[var(--action-primary)]">Event ticket</p><p className="font-mono font-semibold text-[var(--text-primary)]">{selected.link.ticketNumber}</p></div></div>
          </div>
        )}

        {/* Next Upcoming Session */}
        {nextSession && (
          <div className="mt-4 rounded-lg border border-[var(--action-primary)]/40 bg-[var(--success-surface)] p-4">
            <div className="flex items-start gap-3">
              <RadioTower className="mt-0.5 h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase text-[var(--action-primary)]">Next session</p>
                <h3 className="mt-1 font-semibold text-[var(--text-primary)]">{nextSession.name}</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{format(parseISO(nextSession.date), 'EEEE, MMM d, yyyy')} · {nextSession.startTime} – {nextSession.endTime}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{nextSession.venue}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('runshow:workspace-tab', { detail: { tab: 'schedule' } }))}>
                View full schedule
              </Button>
            </div>
          </div>
        )}

        {/* Event Description */}
        {event.objectives && event.objectives.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Event Highlights</h3>
            <ul className="mt-2 space-y-1">
              {event.objectives.map((objective, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--action-primary)]" />{objective}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Event Organizer Contact */}
        {event.audience && (
          <div className="mt-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Organizer Information</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{event.audience}</p>
          </div>
        )}
      </Card>

      {/* Event Details Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Capacity & Attendance */}
        <Card padding="md">
          <h2 className="font-semibold text-[var(--text-primary)]">Attendance and Capacity</h2>
          <div className="mt-4 space-y-4">
            <Capacity label="Planned participant capacity" value={event.participantCapacity?.toLocaleString() ?? 'Not specified'} detail="Organizer-entered capacity; not an attendance count." />
            <Capacity label="Registration target" value={event.targetRegistrations.toLocaleString()} detail="Planning goal; distinct from venue capacity." />
            <Capacity label="Recorded registrations" value={event.currentRegistrations.toLocaleString()} detail={event.isDemo ? 'Simulated demo count; not live check-in.' : 'Count from shared event data; not live check-in.'} />
            <Capacity label="Remaining capacity" value={event.participantCapacity === undefined ? 'Not available' : Math.max(0, event.participantCapacity - event.currentRegistrations).toLocaleString()} detail={event.participantCapacity === undefined ? 'No explicit capacity is recorded.' : event.currentRegistrations > event.participantCapacity ? 'Recorded registrations exceed planned capacity.' : 'Based on planned capacity minus recorded registrations.'} />
          </div>
        </Card>

        {/* Latest Announcements */}
        <Card padding="md">
          <h2 className="font-semibold text-[var(--text-primary)]">Recent Announcements</h2>
          <div className="mt-4 space-y-3">
            {eventAnnouncements.length ? eventAnnouncements.slice(0, 3).map(item => (
              <article key={item.id} className="rounded-md border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-[var(--text-primary)]">{item.title}</h3>
                  {item.isDemo && <Badge variant="secondary" className="text-xs">Demo update</Badge>}
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-2">{item.message}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{publishedLabel(item.publishedAt)}</p>
              </article>
            )) : (
              <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No announcements have been published for this event.</p>
            )}
            {eventAnnouncements.length > 3 && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => window.dispatchEvent(new CustomEvent('runshow:workspace-tab', { detail: { tab: 'announcements' } }))}>
                View all {eventAnnouncements.length} announcements
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function dateRange(startValue: string, endValue?: string) {
  const start = parseISO(startValue);
  if (!Number.isFinite(start.getTime())) return 'Dates pending';
  const end = parseISO(endValue || startValue);
  if (!isValid(end)) return format(start, 'MMM d, yyyy');
  return format(start, 'MMM d, yyyy') === format(end, 'MMM d, yyyy') ? format(start, 'MMM d, yyyy') : `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
}

function publishedLabel(value: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, 'MMM d, yyyy · h:mm a') : 'Date unavailable';
}

function registrationStatusLabel(status: 'invited' | 'registered' | 'cancelled') {
  return status === 'registered' ? 'Registered' : status === 'invited' ? 'Invitation only' : 'Cancelled';
}

function Capacity({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="flex items-start gap-3"><Users className="mt-0.5 h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true"/><div><p className="text-xs text-[var(--text-secondary)]">{label}</p><p className="mt-0.5 font-semibold tabular-nums text-[var(--text-primary)]">{value}</p><p className="text-xs text-[var(--text-muted)]">{detail}</p></div></div>;
}
