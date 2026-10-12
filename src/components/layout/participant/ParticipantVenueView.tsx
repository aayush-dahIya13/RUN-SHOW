'use client';

import { useState } from 'react';
import { MapPin, MonitorPlay, RadioTower, CalendarDays, ExternalLink, Mail } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { useDemoSession } from '@/lib/demo-auth';
import { useDashboardStore } from '@/lib/dashboard-state';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function ParticipantVenueView() {
  const session = useDemoSession();
  const { events, participantEvents } = useDashboardStore();
  const links = participantEvents.filter(link => link.accountId === session?.id);
  const myEvents = links.map(link => ({ link, event: events.find(item => item.id === link.eventId) })).filter((item): item is { link: typeof links[number]; event: NonNullable<typeof item.event> } => !!item.event);
  const [selectedEventId, setSelectedEventId] = useState('');

  const selected = myEvents.find(item => item.event.id === selectedEventId) ?? myEvents[0];
  const event = selected?.event;

  if (!myEvents.length) {
    return (
      <Card padding="lg" className="text-center">
        <RadioTower className="mx-auto h-12 w-12 text-[var(--text-muted)]" aria-hidden="true" />
        <h2 className="mt-4 font-semibold text-[var(--text-primary)]">No events are linked to this account</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">An event organizer must associate an event with your participant account.</p>
      </Card>
    );
  }

  if (!event) return null;

  const dateRange = (startValue: string, endValue?: string) => {
    const start = parseISO(startValue);
    if (!Number.isFinite(start.getTime())) return 'Dates pending';
    const end = parseISO(endValue || startValue);
    if (!isValid(end)) return format(start, 'MMM d, yyyy');
    return format(start, 'MMM d, yyyy') === format(end, 'MMM d, yyyy') ? format(start, 'MMM d, yyyy') : `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  };

  return (
    <div className="space-y-6">
      {myEvents.length > 1 && (
        <div className="flex flex-wrap gap-2" aria-label="Choose event">
          {myEvents.map(item => (
            <Button key={item.event.id} type="button" variant={item.event.id === event.id ? 'primary' : 'secondary'} size="sm" onClick={() => setSelectedEventId(item.event.id)}>
              {item.event.name}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Venue Card */}
        <Card padding="md">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="font-semibold text-[var(--text-primary)]">{event.format === 'virtual' ? 'Online platform' : 'Venue'}</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{event.venue || 'Venue or platform has not been provided.'}</p>
              <p className="mt-3">
                <Badge variant={event.venueConfirmed ? 'success' : 'warning'} className="text-xs">
                  {event.venueConfirmed ? 'Confirmed' : 'Pending confirmation'}
                </Badge>
              </p>
              {event.format === 'virtual' && event.venue && (
                <p className="mt-3">
                  <Button variant="secondary" size="sm" onClick={() => window.open(event.venue!, '_blank')} className="flex items-center gap-2">
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    Open platform
                  </Button>
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Event Details Card */}
        <Card padding="md">
          <div className="flex items-start gap-3">
            <MonitorPlay className="mt-0.5 h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="font-semibold text-[var(--text-primary)]">Event details</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-[var(--text-secondary)]">Dates</dt>
                  <dd className="mt-1 text-[var(--text-primary)]">{dateRange(event.startDate || event.date, event.endDate)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-secondary)]">Format</dt>
                  <dd className="mt-1 capitalize text-[var(--text-primary)]">{event.format || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-secondary)]">Participant instructions</dt>
                  <dd className="mt-1 text-[var(--text-primary)]">{event.participantInstructions || 'No participant instructions have been published.'}</dd>
                </div>
                {event.type && (
                  <div>
                    <dt className="text-[var(--text-secondary)]">Event type</dt>
                    <dd className="mt-1 text-[var(--text-primary)]">{event.type}</dd>
                  </div>
                )}
                {event.audience && (
                  <div>
                    <dt className="text-[var(--text-secondary)]">Target audience</dt>
                    <dd className="mt-1 text-[var(--text-primary)]">{event.audience}</dd>
                  </div>
                )}
                {event.objectives && event.objectives.length > 0 && (
                  <div>
                    <dt className="text-[var(--text-secondary)]">Objectives</dt>
                    <dd className="mt-1 text-[var(--text-primary)]">
                      <ul className="list-disc list-inside space-y-1">
                        {event.objectives.map((objective, index) => (
                          <li key={index}>{objective}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                {event.budget && (
                  <div>
                    <dt className="text-[var(--text-secondary)]">Budget</dt>
                    <dd className="mt-1 text-[var(--text-primary)]">${event.budget.toLocaleString()}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Details */}
      {event.operationalRequirements && (
        <Card padding="md">
          <h2 className="font-semibold text-[var(--text-primary)]">Operational Requirements</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{event.operationalRequirements}</p>
        </Card>
      )}

      {/* Quick Navigation */}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('runshow:workspace-tab', { detail: { tab: 'schedule' } }))}>
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          <span>View Schedule</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('runshow:workspace-tab', { detail: { tab: 'announcements' } }))}>
          <Mail className="h-4 w-4" aria-hidden="true" />
          <span>View Announcements</span>
        </Button>
      </div>
    </div>
  );
}