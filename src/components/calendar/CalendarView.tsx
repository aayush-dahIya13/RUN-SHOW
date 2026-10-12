'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Users, X } from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { Event, Risk, Task } from '@/lib/types';
import { EventStatus, eventEnd, eventStart, getEventStatus, isTaskOverdue } from '@/lib/event-utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { AnchoredPreview } from '@/components/ui/AnchoredPreview';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const statusLabel: Record<EventStatus, string> = { past: 'Completed', active: 'In progress', upcoming: 'Upcoming', unscheduled: 'Dates not set' };
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

function healthForEvent(event: Event, tasks: Task[], risks: Risk[], now: Date) {
  const status = getEventStatus(event, now);
  if (status !== 'active' || (!tasks.length && !risks.length)) return { label: 'Health data unavailable', needsAttention: false, available: false };
  const unresolvedRisks = risks.filter(risk => (risk.status === 'open' || risk.status === 'in-progress') && (risk.severity === 'critical' || risk.severity === 'high'));
  const needsAttention = unresolvedRisks.length > 0 || tasks.some(task => task.status === 'blocked' || isTaskOverdue(task.deadline, task.status, now));
  return { label: needsAttention ? 'Needs attention' : 'Going well', needsAttention, available: true };
}

function DatePreview({ day, events, tasks, risks, now, onOpen, onCreate }: {
  day: Date;
  events: Event[];
  tasks: Task[];
  risks: Risk[];
  now: Date;
  onOpen: (event: Event) => void;
  onCreate: () => void;
}) {
  const dateKey = format(day, 'yyyy-MM-dd');
  return <div className="space-y-3">
    <header className="flex items-start justify-between gap-3">
      <div><p className="text-sm font-bold text-[var(--text-primary)]">{format(day, 'EEEE, MMMM d, yyyy')}</p><p className="mt-0.5 text-xs text-[var(--text-secondary)]">{events.length} scheduled {events.length === 1 ? 'event' : 'events'}</p></div>
      {isSameDay(day, now) && <span className="shrink-0 rounded-full border border-[var(--action-primary)]/40 bg-[var(--success-surface)] px-2 py-1 text-[10px] font-semibold text-[var(--action-primary)]">Today</span>}
    </header>
    {events.length === 0 ? <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-elevated)]/70 px-3 py-4 text-center">
      <CalendarDays className="mx-auto h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold">Nothing scheduled for this day</p><p className="mt-1 text-xs text-[var(--text-secondary)]">A little room for something great.</p>
      <Button type="button" size="sm" className="mt-3 w-full" onClick={onCreate}><Plus className="h-4 w-4" aria-hidden="true" />Create event</Button>
    </div> : <ul className="max-h-[min(52vh,22rem)] space-y-2 overflow-y-auto pr-1">
      {events.map(event => {
        const eventTasks = tasks.filter(task => task.eventId === event.id);
        const eventRisks = risks.filter(risk => risk.eventId === event.id);
        const health = healthForEvent(event, eventTasks, eventRisks, now);
        const eventStatus = getEventStatus(event, now);
        const sessions = (event.sessions ?? []).filter(session => session.date === dateKey);
        const openRisks = eventRisks.filter(risk => (risk.status === 'open' || risk.status === 'in-progress') && (risk.severity === 'critical' || risk.severity === 'high'));
        const statusTone = health.needsAttention ? 'text-[var(--accent)]' : health.label === 'Going well' ? 'text-[var(--action-primary)]' : 'text-[var(--text-secondary)]';
        return <li key={event.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-card)]/80 p-3">
          <div className="flex items-start justify-between gap-2"><h3 className="min-w-0 text-sm font-semibold leading-snug">{event.name}</h3><span className="shrink-0 rounded-full bg-[var(--surface-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">{statusLabel[eventStatus]}</span></div>
          <p className={`mt-1 text-xs font-semibold ${statusTone}`}>{health.label}</p>
          {sessions.length ? <ul className="mt-2 space-y-1.5">{sessions.slice(0, 3).map(session => <li key={session.id} className="text-xs text-[var(--text-secondary)]"><span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{session.startTime && session.endTime ? `${session.startTime}–${session.endTime}` : 'Time not provided'} · {session.name}</span>{session.venue && <span className="mt-0.5 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{session.venue}</span>}</li>)}</ul> : <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"><Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{event.startTime && event.endTime ? `${event.startTime}–${event.endTime}${event.timezone ? ` · ${event.timezone}` : ''}` : 'Time not provided'}</p>}
          {event.venue && !sessions.some(session => session.venue === event.venue) && <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{event.venue}</p>}
          {openRisks.length > 0 && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--accent)]"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{openRisks.length} critical/high {openRisks.length === 1 ? 'risk' : 'risks'} open</p>}
          <Button type="button" size="sm" variant="secondary" className="mt-3 w-full" onClick={() => onOpen(event)}>Open event details</Button>
        </li>;
      })}
    </ul>}
  </div>;
}

export function CalendarView() {
  const { events, tasks, risks, selectEvent, setSelectedView } = useDashboardStore();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
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

  function openEvent(event: Event) {
    selectEvent(event.id);
    setSelected(event);
  }

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
            <div><h2 className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">{format(month, 'MMMM yyyy')}</h2><p className="text-sm text-[var(--text-secondary)]">{events.length ? `${events.length} event${events.length === 1 ? '' : 's'} in this workspace` : 'No events yet'}</p></div>
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
          {weekdays.map(day => <div key={day} role="columnheader" className="border-b border-r border-[var(--border)] bg-[var(--surface-elevated)] px-1 py-2 text-center text-xs font-bold text-[var(--text-primary)] sm:px-3">{day}</div>)}
          {days.map(day => {
            const dayEvents = eventsByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
            const dateKey = format(day, 'yyyy-MM-dd');
            const inCurrentMonth = isSameMonth(day, month);
            const isToday = isSameDay(day, today);
            const isSelectedDate = selectedDate === dateKey;
            return <AnchoredPreview key={`${format(month, 'yyyy-MM')}-${dateKey}`} label={`${format(day, 'EEEE, MMMM d, yyyy')} date preview`} side="right" previewOnTouch previewClassName="runshow-calendar-preview max-h-[min(72vh,34rem)] overflow-y-auto !p-4" content={<DatePreview day={day} events={dayEvents} tasks={tasks} risks={risks} now={today} onOpen={openEvent} onCreate={() => setSelectedView('setup')} />} className="block min-w-0">
            <div role="gridcell" aria-label={`${format(day, 'EEEE, MMMM d, yyyy')}${dayEvents.length ? `, ${dayEvents.length} events` : ', no events'}`} className={`group min-h-28 border-b border-r border-[var(--border)] p-1 transition-colors hover:border-dashed hover:border-[var(--action-primary)] hover:bg-[var(--success-surface)]/40 sm:min-h-36 sm:p-2 ${inCurrentMonth ? 'bg-[var(--surface-card)]' : 'bg-[var(--surface-elevated)]/60'}`}>
              <div className="flex items-center justify-between">
                <button type="button" aria-label={`Preview ${format(day, 'EEEE, MMMM d, yyyy')}`} aria-pressed={isSelectedDate} className={`inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-full border px-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)] ${isToday ? `border-[var(--action-primary)] bg-[var(--action-primary-fill)] font-bold text-[var(--action-primary-foreground)] ${isSelectedDate ? 'ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--surface-card)]' : ''}` : isSelectedDate ? 'border-[var(--accent)] bg-[var(--accent-muted)] font-bold text-[var(--text-primary)]' : inCurrentMonth ? 'border-transparent font-bold text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]' : 'border-transparent font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-elevated)]'}`} onClick={() => setSelectedDate(dateKey)}>{format(day, 'd')}</button>
                {dayEvents.length > 1 && <span className="text-[10px] text-[var(--text-muted)]">{dayEvents.length} events</span>}
              </div>
              <div className="mt-1 space-y-1">
                {events.length > 0 && dayEvents.length === 0 && inCurrentMonth && <span className="block truncate text-[8px] text-[var(--text-muted)] sm:text-[10px]">No events</span>}
                {dayEvents.map(event => {
                  const status = getEventStatus(event, today);
                  return <button key={event.id} type="button" aria-label={`${event.name} - ${statusLabel[status]}; open details`} onClick={click => { click.stopPropagation(); openEvent(event); }} className={`block w-full cursor-pointer truncate rounded border px-1 py-1 text-left text-[10px] leading-tight transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-px hover:border-dashed hover:border-[var(--action-primary)] hover:shadow-sm active:translate-y-0 focus-visible:-translate-y-px focus:outline-none focus:ring-2 focus:ring-[var(--focus)] sm:px-1.5 sm:text-xs ${statusClass[status]}`}>
                      <span className="block truncate font-medium">{event.name}</span><span className="hidden text-[10px] sm:block">{statusLabel[status]}</span>
                    </button>;
                })}
              </div>
            </div>
            </AnchoredPreview>;
          })}
        </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-secondary)]" aria-label="Event status legend">
          {(['past', 'active', 'upcoming'] as const).map(status => <span key={status} className="inline-flex items-center gap-2"><span className={`h-3 w-3 rounded-sm border ${statusClass[status]}`} />{statusLabel[status]}</span>)}
        </div>
      </Card>

      <AnimatePresence>
      {selected && <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.16 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--metallic-black)]/55 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}>
        <motion.section initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.99 }} transition={{ duration: reduceMotion ? 0 : 0.16 }} role="dialog" aria-modal="true" aria-labelledby="calendar-event-title" className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--surface-card)] p-5 shadow-xl">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">{statusLabel[getEventStatus(selected)]}</p><h2 id="calendar-event-title" className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{selected.name}</h2></div><button autoFocus type="button" aria-label="Close event details" onClick={() => setSelected(null)} className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"><X className="h-5 w-5" aria-hidden="true" /></button></div>
          <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-[var(--text-secondary)]">Dates</dt><dd className="mt-1 font-medium text-[var(--text-primary)]">{dateRange(selected)}</dd></div>
            <div><dt className="text-[var(--text-secondary)]">Schedule</dt><dd className="mt-1 font-medium text-[var(--text-primary)]">{selected.startTime && selected.endTime ? `${selected.startTime}–${selected.endTime}${selected.timezone ? ` · ${selected.timezone}` : ''}` : 'Time not provided'}</dd></div>
            <div><dt className="text-[var(--text-secondary)]">Format</dt><dd className="mt-1 font-medium capitalize text-[var(--text-primary)]">{selected.format ?? 'Not specified'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-[var(--text-secondary)]">Venue</dt><dd className="mt-1 flex items-center gap-1 font-medium text-[var(--text-primary)]"><MapPin className="h-4 w-4" aria-hidden="true" />{selected.venue || 'Not confirmed'}</dd></div>
            {(selected.meetingUrl || selected.joiningInstructions) && <div className="sm:col-span-2"><dt className="text-[var(--text-secondary)]">Online details</dt><dd className="mt-1 break-words font-medium text-[var(--text-primary)]">{selected.meetingUrl || selected.joiningInstructions}</dd></div>}
            <div className="sm:col-span-2"><dt className="text-[var(--text-secondary)]">Registration progress</dt><dd className="mt-1 flex items-center gap-2 font-medium text-[var(--text-primary)]"><Users className="h-4 w-4" aria-hidden="true" />{Number.isFinite(selected.currentRegistrations) && Number.isFinite(selected.targetRegistrations) ? `${selected.currentRegistrations.toLocaleString()} / ${selected.targetRegistrations.toLocaleString()} registrations` : 'Registration data unavailable'}</dd></div>
            <div><dt className="text-[var(--text-secondary)]">Partners</dt><dd className="mt-1 font-medium text-[var(--text-primary)]">{Number.isFinite(selected.partnerConfirmations) && Number.isFinite(selected.totalPartners) ? `${selected.partnerConfirmations} / ${selected.totalPartners} confirmed` : 'Partner data unavailable'}</dd></div>
            <div><dt className="text-[var(--text-secondary)]">Venue status</dt><dd className="mt-1 font-medium text-[var(--text-primary)]">{selected.venueConfirmed ? 'Confirmed' : 'Pending'}</dd></div>
          </dl>
          <div className="mt-6 flex justify-end"><Button variant="secondary" onClick={() => setSelected(null)}>Close details</Button></div>
        </motion.section>
      </motion.div>}
      </AnimatePresence>
    </section>
  );
}
