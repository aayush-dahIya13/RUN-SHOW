'use client';

import { useEffect, useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Plus, Users, X } from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { Event } from '@/lib/types';
import { EventStatus, eventEnd, eventStart, getEventStatus } from '@/lib/event-utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const statusLabel: Record<EventStatus, string> = { past: 'Past', active: 'Active now', upcoming: 'Upcoming', unscheduled: 'Dates not set' };
const statusClass: Record<EventStatus, string> = {
  past: 'border-[var(--border)] bg-[var(--neutral-surface)] text-[var(--text-secondary)]',
  active: 'border-[var(--action-primary)]/50 bg-[var(--success-surface)] text-[var(--text-primary)]',
  upcoming: 'border-[var(--accent)]/60 bg-[var(--accent-muted)] text-[var(--text-primary)]',
  unscheduled: 'border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]',
};

function dateRange(event: Event) {
  const start = eventStart(event);
  const end = eventEnd(event);
  if (!start) return 'Date not set';
  return end && !isSameDay(start, end) ? `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}` : format(start, 'MMM d, yyyy');
}

export function CalendarView() {
  const { events, selectEvent, setSelectedView } = useDashboardStore();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Event | null>(null);
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) }), [month]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach(event => {
      const start = eventStart(event);
      const end = eventEnd(event);
      if (!start || !end) return;
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cursor <= last) {
        const key = format(cursor, 'yyyy-MM-dd');
        map.set(key, [...(map.get(key) ?? []), event]);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [events]);
  const today = new Date();

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  return (
    <section className="space-y-4" aria-label="Event calendar">
      <Card padding="md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success-surface)] text-[var(--action-primary)]"><CalendarDays className="h-5 w-5" aria-hidden="true" /></span>
            <div><h2 className="font-semibold text-[var(--text-primary)]">{format(month, 'MMMM yyyy')}</h2><p className="text-sm text-[var(--text-secondary)]">{events.length ? `${events.length} event${events.length === 1 ? '' : 's'} in this workspace` : 'No events yet'}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>Today</Button>
            <Tooltip label="Previous month" side="bottom"><Button variant="ghost" size="sm" className="h-10 w-10 p-0" aria-label="Previous month" onClick={() => setMonth(value => subMonths(value, 1))}><ChevronLeft className="h-5 w-5" aria-hidden="true" /></Button></Tooltip>
            <Tooltip label="Next month" side="bottom"><Button variant="ghost" size="sm" className="h-10 w-10 p-0" aria-label="Next month" onClick={() => setMonth(value => addMonths(value, 1))}><ChevronRight className="h-5 w-5" aria-hidden="true" /></Button></Tooltip>
          </div>
        </div>
        {!events.length && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] p-4"><p className="text-sm text-[var(--text-secondary)]">Your events will appear on this calendar once created.</p><Button size="sm" onClick={() => setSelectedView('setup')}><Plus className="h-4 w-4" aria-hidden="true" />Create Event</Button></div>}
        <div className="mt-5 overflow-x-auto overscroll-x-contain">
        <div className="grid min-w-[560px] grid-cols-7 border-l border-t border-[var(--border)] sm:min-w-0" role="grid" aria-label={format(month, 'MMMM yyyy')}>
          {weekdays.map(day => <div key={day} role="columnheader" className="border-b border-r border-[var(--border)] bg-[var(--surface-elevated)] px-1 py-2 text-center text-xs font-semibold text-[var(--text-secondary)] sm:px-3">{day}</div>)}
          {days.map(day => {
            const dayEvents = eventsByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
            return <div key={day.toISOString()} role="gridcell" aria-label={`${format(day, 'EEEE, MMMM d')}${dayEvents.length ? `, ${dayEvents.length} events` : ', no events'}`} className={`min-h-28 border-b border-r border-[var(--border)] p-1 sm:min-h-36 sm:p-2 ${isSameMonth(day, month) ? 'bg-[var(--surface-card)]' : 'bg-[var(--surface-elevated)]/60'}`}>
              <div className="flex items-center justify-between">
                <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs ${isSameDay(day, today) ? 'bg-[var(--action-primary-fill)] font-bold text-[var(--action-primary-foreground)]' : isSameMonth(day, month) ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{format(day, 'd')}</span>
                {dayEvents.length > 1 && <span className="text-[10px] text-[var(--text-muted)]">{dayEvents.length} events</span>}
              </div>
              <div className="mt-1 space-y-1">
                {events.length > 0 && dayEvents.length === 0 && isSameMonth(day, month) && <span className="block truncate text-[8px] text-[var(--text-muted)] sm:text-[10px]">No events</span>}
                {dayEvents.map(event => {
                  const status = getEventStatus(event, today);
                  return <button key={event.id} type="button" onClick={() => { selectEvent(event.id); setSelected(event); }} aria-label={`${event.name} - ${statusLabel[status]}`} className={`block w-full truncate rounded border px-1 py-1 text-left text-[10px] leading-tight transition-colors hover:border-[var(--action-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] sm:px-1.5 sm:text-xs ${statusClass[status]}`}>
                    <span className="block truncate font-medium">{event.name}</span><span className="hidden text-[10px] sm:block">{statusLabel[status]}</span>
                  </button>;
                })}
              </div>
            </div>;
          })}
        </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-secondary)]" aria-label="Event status legend">
          {(['past', 'active', 'upcoming'] as const).map(status => <span key={status} className="inline-flex items-center gap-2"><span className={`h-3 w-3 rounded-sm border ${statusClass[status]}`} />{statusLabel[status]}</span>)}
        </div>
      </Card>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--metallic-black)]/55 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="calendar-event-title" className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--surface-card)] p-5 shadow-xl">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">{statusLabel[getEventStatus(selected)]}</p><h2 id="calendar-event-title" className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{selected.name}</h2></div><button autoFocus type="button" aria-label="Close event details" onClick={() => setSelected(null)} className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"><X className="h-5 w-5" aria-hidden="true" /></button></div>
          <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-[var(--text-secondary)]">Dates</dt><dd className="mt-1 font-medium text-[var(--text-primary)]">{dateRange(selected)}</dd></div>
            <div><dt className="text-[var(--text-secondary)]">Format</dt><dd className="mt-1 font-medium capitalize text-[var(--text-primary)]">{selected.format ?? 'Not specified'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-[var(--text-secondary)]">Venue</dt><dd className="mt-1 flex items-center gap-1 font-medium text-[var(--text-primary)]"><MapPin className="h-4 w-4" aria-hidden="true" />{selected.venue || 'Not confirmed'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-[var(--text-secondary)]">Registration progress</dt><dd className="mt-1 flex items-center gap-2 font-medium text-[var(--text-primary)]"><Users className="h-4 w-4" aria-hidden="true" />{selected.currentRegistrations.toLocaleString()} / {selected.targetRegistrations.toLocaleString()} registrations</dd></div>
            <div><dt className="text-[var(--text-secondary)]">Partners</dt><dd className="mt-1 font-medium text-[var(--text-primary)]">{selected.partnerConfirmations} / {selected.totalPartners} confirmed</dd></div>
            <div><dt className="text-[var(--text-secondary)]">Venue status</dt><dd className="mt-1 font-medium text-[var(--text-primary)]">{selected.venueConfirmed ? 'Confirmed' : 'Pending'}</dd></div>
          </dl>
          <div className="mt-6 flex justify-end"><Button variant="secondary" onClick={() => setSelected(null)}>Close details</Button></div>
        </section>
      </div>}
    </section>
  );
}
