'use client';

import { CalendarDays, CheckSquare, CircleAlert, Clock3, LayoutDashboard, Plus, ShieldAlert } from 'lucide-react';
import { addDays, format, isBefore, parseISO, startOfDay } from 'date-fns';
import { useDemoSession } from '@/lib/demo-auth';
import { useDashboardStore } from '@/lib/dashboard-state';
import { eventStart, getEventStatus, isTaskOverdue } from '@/lib/event-utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

function greetingFor(date: Date) {
  const hour = date.getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export function HomeView({ onCreateEvent }: { onCreateEvent: () => void }) {
  const session = useDemoSession();
  const events = useDashboardStore(state => state.events);
  const tasks = useDashboardStore(state => state.tasks);
  const risks = useDashboardStore(state => state.risks);
  const setSelectedView = useDashboardStore(state => state.setSelectedView);
  const selectEvent = useDashboardStore(state => state.selectEvent);
  const now = new Date();
  const upcomingEvents = events
    .filter(item => getEventStatus(item, now) === 'upcoming')
    .sort((a, b) => (eventStart(a)?.getTime() ?? Infinity) - (eventStart(b)?.getTime() ?? Infinity))
    .slice(0, 3);
  const openTasks = tasks.filter(task => task.status !== 'completed');
  const urgentTasks = openTasks
    .filter(task => task.priority === 'urgent' || task.status === 'blocked' || isTaskOverdue(task.deadline, task.status, now) || isBefore(parseISO(task.deadline), addDays(startOfDay(now), 3)))
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 4);
  const blockers = risks
    .filter(risk => (risk.severity === 'critical' || risk.severity === 'high') && (risk.status === 'open' || risk.status === 'in-progress'))
    .slice(0, 4);
  const displayName = session?.name?.trim() || '';

  return <div className="space-y-5 sm:space-y-6">
    <section className="flex flex-col justify-between gap-5 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 shadow-sm shadow-[var(--shadow-color)] sm:flex-row sm:items-center sm:p-7">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--action-primary)]">Your command centre</p>
        <h2 className="runshow-scroll-heading mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{displayName ? `${greetingFor(now)}, ${displayName}!` : 'Welcome back, Organizer'}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Welcome back to RUNSHOW. Here is what needs your attention across upcoming events and operations.</p>
      </div>
      <Button size="lg" onClick={onCreateEvent} className="shrink-0"><Plus className="h-5 w-5" aria-hidden="true" />Create Event</Button>
    </section>

    <div className="grid gap-4 xl:grid-cols-3">
      <Card padding="md" className="min-w-0">
        <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-[var(--text-primary)]">Upcoming events</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Next events on your calendar</p></div><CalendarDays className="h-5 w-5 shrink-0 text-[var(--action-primary)]" aria-hidden="true" /></div>
        <div className="mt-4 space-y-2">{upcomingEvents.length ? upcomingEvents.map(item => <button key={item.id} type="button" onClick={() => { selectEvent(item.id); setSelectedView('calendar'); }} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"><span className="min-w-0"><span className="block truncate text-sm font-medium text-[var(--text-primary)]">{item.name}</span><span className="text-xs text-[var(--text-secondary)]">{item.venue || 'Venue pending'}</span></span><span className="shrink-0 text-right text-xs text-[var(--text-secondary)]">{eventStart(item) ? format(eventStart(item)!, 'MMM d') : 'Unscheduled'}</span></button>) : <p className="rounded-md bg-[var(--surface-elevated)] p-3 text-sm text-[var(--text-secondary)]">No upcoming events are scheduled yet.</p>}</div>
        <button type="button" onClick={() => setSelectedView('calendar')} className="focus-ring mt-3 inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-medium text-[var(--action-primary)] hover:bg-[var(--surface-elevated)]">Open Calendar<CalendarDays className="h-4 w-4" /></button>
      </Card>

      <Card padding="md" className="min-w-0">
        <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-[var(--text-primary)]">Urgent tasks</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Overdue, blocked or due soon</p></div><Clock3 className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden="true" /></div>
        <div className="mt-4 space-y-2">{urgentTasks.length ? urgentTasks.map(task => <button key={task.id} type="button" onClick={() => setSelectedView('tasks')} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"><span className="min-w-0"><span className="block truncate text-sm font-medium text-[var(--text-primary)]">{task.title}</span><span className="text-xs capitalize text-[var(--text-secondary)]">{isTaskOverdue(task.deadline, task.status, now) ? 'Overdue' : task.status === 'blocked' ? 'Blocked' : `${task.priority} priority`}</span></span><span className="shrink-0 text-xs text-[var(--text-secondary)]">{task.deadline}</span></button>) : <p className="rounded-md bg-[var(--surface-elevated)] p-3 text-sm text-[var(--text-secondary)]">No urgent open tasks right now.</p>}</div>
        <button type="button" onClick={() => setSelectedView('tasks')} className="focus-ring mt-3 inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-medium text-[var(--action-primary)] hover:bg-[var(--surface-elevated)]">View Tasks<CheckSquare className="h-4 w-4" /></button>
      </Card>

      <Card padding="md" className="min-w-0">
        <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-[var(--text-primary)]">Critical blockers</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Open high-impact risks</p></div><ShieldAlert className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden="true" /></div>
        <div className="mt-4 space-y-2">{blockers.length ? blockers.map(risk => <div key={risk.id} className="rounded-md border border-[var(--border)] px-3 py-2"><p className="flex items-start gap-2 text-sm font-medium text-[var(--text-primary)]"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />{risk.title}</p><p className="mt-1 pl-6 text-xs capitalize text-[var(--text-secondary)]">{risk.severity} · {risk.owner}</p></div>) : <p className="rounded-md bg-[var(--surface-elevated)] p-3 text-sm text-[var(--text-secondary)]">No open critical or high risks.</p>}</div>
        <button type="button" onClick={() => setSelectedView('event-health')} className="focus-ring mt-3 inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-medium text-[var(--action-primary)] hover:bg-[var(--surface-elevated)]">Review Event Health<LayoutDashboard className="h-4 w-4" /></button>
      </Card>
    </div>
    <div className="flex flex-wrap gap-2" aria-label="Workspace shortcuts">
      <Button variant="secondary" size="sm" onClick={() => setSelectedView('overview')}><LayoutDashboard className="h-4 w-4" aria-hidden="true" />Dashboard</Button>
      <Button variant="secondary" size="sm" onClick={() => setSelectedView('calendar')}><CalendarDays className="h-4 w-4" aria-hidden="true" />Calendar</Button>
      <Button variant="secondary" size="sm" onClick={() => setSelectedView('event-health')}><ShieldAlert className="h-4 w-4" aria-hidden="true" />Event Health</Button>
      <Button variant="secondary" size="sm" onClick={() => setSelectedView('tasks')}><CheckSquare className="h-4 w-4" aria-hidden="true" />Tasks</Button>
    </div>
  </div>;
}
