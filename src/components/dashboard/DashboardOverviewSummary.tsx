'use client';

import { CalendarDays, Clock3, Plus, TriangleAlert } from 'lucide-react';
import { format } from 'date-fns';
import { useDashboardStore } from '@/lib/dashboard-state';
import { eventStart, getEventStatus, isTaskOverdue } from '@/lib/event-utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function DashboardOverviewSummary() {
  const { events, event, tasks, risks, setSelectedView, selectEvent } = useDashboardStore();
  const now = new Date();
  const upcoming = events.filter(item => getEventStatus(item, now) === 'upcoming').sort((a, b) => (eventStart(a)?.getTime() ?? 0) - (eventStart(b)?.getTime() ?? 0)).slice(0, 3);
  const eventTasks = tasks.filter(task => task.eventId === event.id && task.status !== 'completed');
  const deadlines = eventTasks.slice().sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).slice(0, 4);
  const blockers = risks.filter(risk => risk.eventId === event.id && (risk.severity === 'critical' || risk.severity === 'high') && (risk.status === 'open' || risk.status === 'in-progress'));
  const registrationGap = Math.max(0, event.targetRegistrations - event.currentRegistrations);

  return <div className="grid gap-4 xl:grid-cols-3">
    <Card padding="md" className="xl:col-span-1">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-[var(--text-secondary)]">Selected event</p><h2 className="mt-1 font-semibold text-[var(--text-primary)]">{event.name}</h2></div><CalendarDays className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" /></div>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">{event.currentRegistrations.toLocaleString()} of {event.targetRegistrations.toLocaleString()} registrations · {registrationGap.toLocaleString()} to target</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{event.daysRemaining} days remaining · {event.isDemo ? 'Demo data' : getEventStatus(event, now)}</p>
      <div className="mt-4 border-t border-[var(--divider)] pt-3"><p className="mb-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">Upcoming events</p>{upcoming.length ? <div className="space-y-2">{upcoming.map(item => <button key={item.id} type="button" onClick={() => selectEvent(item.id)} className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"><span className="min-w-0 truncate text-sm font-medium text-[var(--text-primary)]">{item.name}{item.isDemo ? <span className="ml-1 text-xs font-normal text-[var(--text-secondary)]">Demo</span> : null}</span><span className="shrink-0 text-xs text-[var(--text-secondary)]">{eventStart(item) ? format(eventStart(item)!, 'MMM d') : 'Unscheduled'}</span></button>)}</div> : <p className="text-sm text-[var(--text-secondary)]">No upcoming events scheduled.</p>}</div>
      <Button className="mt-4 w-full" size="sm" onClick={() => setSelectedView('setup')}><Plus className="h-4 w-4" aria-hidden="true" />Create Event</Button>
    </Card>

    <Card padding="md">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-[var(--text-primary)]">Upcoming deadlines</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">For {event.name}</p></div><Clock3 className="h-5 w-5 text-[var(--text-secondary)]" aria-hidden="true" /></div>
      <div className="mt-3 space-y-2">{deadlines.length ? deadlines.map(task => <button key={task.id} type="button" onClick={() => setSelectedView('tasks')} className="flex w-full items-start justify-between gap-3 rounded-md border border-[var(--border)] p-2.5 text-left hover:bg-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"><span className="min-w-0"><span className="block truncate text-sm font-medium text-[var(--text-primary)]">{task.title}</span><span className="text-xs text-[var(--text-secondary)]">{task.assignee} · {task.status === 'blocked' ? 'Blocked' : isTaskOverdue(task.deadline, task.status) ? 'Overdue' : task.status}</span></span><span className="shrink-0 text-xs text-[var(--text-secondary)]">{task.deadline}</span></button>) : <p className="text-sm text-[var(--text-secondary)]">No open deadlines for this event.</p>}</div>
    </Card>

    <Card padding="md">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-[var(--text-primary)]">Critical blockers</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">{blockers.length} open critical or high risks</p></div><TriangleAlert className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" /></div>
      <div className="mt-3 space-y-2">{blockers.length ? blockers.slice(0, 4).map(risk => <button key={risk.id} type="button" onClick={() => setSelectedView('operations')} className="w-full rounded-md border border-[var(--border)] p-2.5 text-left hover:bg-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"><span className="block text-sm font-medium text-[var(--text-primary)]">{risk.title}</span><span className="text-xs capitalize text-[var(--text-secondary)]">{risk.severity} · {risk.owner}</span></button>) : <p className="text-sm text-[var(--text-secondary)]">No open critical or high blockers.</p>}</div>
    </Card>
  </div>;
}
