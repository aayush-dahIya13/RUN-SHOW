'use client';

import { useState } from 'react';
import { CalendarDays, MapPin, RadioTower } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { useDemoSession } from '@/lib/demo-auth';
import { useDashboardStore } from '@/lib/dashboard-state';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function ParticipantScheduleView() {
  const session = useDemoSession();
  const { events, participantEvents } = useDashboardStore();
  const links = participantEvents.filter(link => link.accountId === session?.id);
  const myEvents = links.map(link => ({ link, event: events.find(item => item.id === link.eventId) })).filter((item): item is { link: typeof links[number]; event: NonNullable<typeof item.event> } => !!item.event);
  const [selectedEventId, setSelectedEventId] = useState('');

  const selected = myEvents.find(item => item.event.id === selectedEventId) ?? myEvents[0];
  const event = selected?.event;
  const sessions = [...(event?.sessions ?? [])].filter(item => isValid(parseISO(item.date))).sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));

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

      <Card padding="md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">{event.name} schedule</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{event.isDemo ? 'Demo schedule' : 'Published event schedule'}</p>
          </div>
          <CalendarDays className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
        </div>

        {sessions.length ? (
          <ol className="mt-5 space-y-0">
            {sessions.map((item, index) => (
              <li key={item.id} className="relative grid grid-cols-[6.5rem_1fr] gap-3 pb-6 last:pb-0">
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">{item.startTime}</p>
                  <p className="text-xs tabular-nums text-[var(--text-secondary)]">to {item.endTime}</p>
                </div>
                <div className="relative border-l-2 border-[var(--divider)] pl-4">
                  <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-[var(--action-primary)]" aria-hidden="true" />
                  <p className="text-sm text-[var(--text-secondary)]">{format(parseISO(item.date), 'EEEE, MMM d, yyyy')}</p>
                  <h3 className="mt-1 font-semibold text-[var(--text-primary)]">{item.name}</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.description}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{item.venue}</span>
                    {item.functionName && <span>{item.functionName}</span>}
                  </p>
                </div>
                {index < sessions.length - 1 && <span className="absolute bottom-1 left-[6.75rem] top-0 -z-0 border-l border-dashed border-[var(--divider)]" aria-hidden="true" />}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-6 rounded-md border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-secondary)]">The event schedule has not been published.</p>
        )}
      </Card>
    </div>
  );
}