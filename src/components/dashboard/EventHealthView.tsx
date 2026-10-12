'use client';

import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Clock3, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useDashboardStore } from '@/lib/dashboard-state';
import { Event } from '@/lib/types';
import { eventEnd, eventStart, getEventStatus, getNextUpcomingEvent, isTaskOverdue } from '@/lib/event-utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

function dateLabel(event: Event) {
  const start = eventStart(event);
  const end = eventEnd(event);
  if (!start) return 'Dates not set';
  return end && format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd') ? `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}` : format(start, 'MMM d, yyyy');
}

export function EventHealthView() {
  const { events, tasks, risks, recommendations, selectEvent, setSelectedView } = useDashboardStore();
  const active = events.filter(event => getEventStatus(event) === 'active').sort((a, b) => (eventStart(a)?.getTime() ?? 0) - (eventStart(b)?.getTime() ?? 0))[0];
  const next = getNextUpcomingEvent(events);

  if (!active) return <Card padding="lg" className="max-w-3xl">
    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent-foreground)]"><CalendarDays className="h-5 w-5" aria-hidden="true" /></div>
    <h2 className="mt-5 text-xl font-semibold text-[var(--text-primary)]">No event is currently active</h2>
    <p className="mt-2 text-sm text-[var(--text-secondary)]">Event Health only reports an event whose scheduled dates include today.</p>
    {next ? <div className="mt-6 border-t border-[var(--divider)] pt-5">
      <p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Next upcoming event{next.isDemo ? ' · Demo data' : ''}</p>
      <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{next.name}</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{dateLabel(next)} · {next.venue || 'Venue not confirmed'}</p>
      <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => { selectEvent(next.id); setSelectedView('overview'); }}>Open event workspace <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button><Button variant="secondary" onClick={() => { selectEvent(next.id); setSelectedView('calendar'); }}>View in Calendar</Button></div>
    </div> : <p className="mt-5 text-sm text-[var(--text-secondary)]">There are no scheduled events yet. Use Create Event to add one.</p>}
  </Card>;

  const eventTasks = tasks.filter(task => task.eventId === active.id);
  const eventRisks = risks.filter(risk => risk.eventId === active.id && (risk.status === 'open' || risk.status === 'in-progress'));
  const seriousRisks = eventRisks.filter(risk => risk.severity === 'critical' || risk.severity === 'high');
  const overdue = eventTasks.filter(task => isTaskOverdue(task.deadline, task.status));
  const completed = eventTasks.filter(task => task.status === 'completed').length;
  const actions = recommendations.filter(item => item.eventId === active.id).slice(0, 3);
  const needsAttention = seriousRisks.length > 0 || overdue.length > 0 || eventTasks.some(task => task.status === 'blocked');

  return <div className="space-y-5">
    {active.isDemo && <p className="rounded-md border border-[var(--accent)]/50 bg-[var(--accent-muted)] px-4 py-3 text-sm text-[var(--text-primary)]">Demo event: registrations, partner and task data below are simulated.</p>}
    <Card padding="md">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[var(--action-primary)]/50 bg-[var(--success-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)]">Active now</span><span className="text-xs text-[var(--text-secondary)]">{active.isDemo ? 'Demo data' : 'Organizer event'}</span></div><h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{active.name}</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">{dateLabel(active)}</p></div>
        <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{active.venue || 'Venue not confirmed'}</div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--divider)] pt-5 lg:grid-cols-4">
        <Metric icon={Users} label="Registrations" value={`${active.currentRegistrations} / ${active.targetRegistrations}`} detail={`${Math.max(0, active.targetRegistrations - active.currentRegistrations)} remaining`} />
        <Metric icon={CheckCircle2} label="Partners" value={`${active.partnerConfirmations} / ${active.totalPartners}`} detail="confirmed" />
        <Metric icon={Clock3} label="Tasks" value={`${completed} / ${eventTasks.length}`} detail={`${overdue.length} overdue`} />
        <Metric icon={AlertTriangle} label="Critical / high risks" value={String(seriousRisks.length)} detail={`${eventRisks.length} open or in progress`} />
      </div>
    </Card>

    <div className="grid gap-5 lg:grid-cols-2">
      <Card padding="md">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[var(--text-primary)]">Operational status</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Derived from open high-priority risks, overdue tasks and blocked work.</p></div><span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${needsAttention ? 'border-[var(--accent)]/60 bg-[var(--accent-muted)] text-[var(--text-primary)]' : 'border-[var(--action-primary)]/50 bg-[var(--success-surface)] text-[var(--text-primary)]'}`}>{needsAttention ? 'Needs attention' : 'No critical blockers'}</span></div>
        <div className="mt-4 space-y-2">
          {seriousRisks.slice(0, 5).map(risk => <button type="button" key={risk.id} onClick={() => setSelectedView('operations')} className="flex w-full items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-3 text-left hover:bg-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"><span className="min-w-0"><span className="block truncate text-sm font-medium text-[var(--text-primary)]">{risk.title}</span><span className="text-xs capitalize text-[var(--text-secondary)]">{risk.severity} · {risk.owner}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" /></button>)}
          {seriousRisks.length === 0 && overdue.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No critical or high risks and no overdue tasks.</p>}
          {overdue.slice(0, 3).map(task => <div key={task.id} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"><span className="font-medium text-[var(--text-primary)]">Overdue: {task.title}</span><span className="ml-2 text-xs text-[var(--text-secondary)]">{task.assignee}</span></div>)}
        </div>
      </Card>
      <Card padding="md">
        <h3 className="font-semibold text-[var(--text-primary)]">Recommended next actions</h3>
        <div className="mt-3 space-y-3">{actions.length ? actions.map(item => <div key={item.id} className="border-b border-[var(--divider)] pb-3 last:border-0"><p className="text-sm font-medium text-[var(--text-primary)]">{item.action}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{item.owner} · Due {item.deadline}</p></div>) : <p className="text-sm text-[var(--text-secondary)]">No recommendations are linked to this event.</p>}</div>
      </Card>
    </div>
  </div>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Users; label: string; value: string; detail: string }) {
  return <div className="min-w-0"><div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"><Icon className="h-4 w-4" aria-hidden="true" />{label}</div><p className="mt-1 text-lg font-semibold tabular-nums text-[var(--text-primary)]">{value}</p><p className="text-xs text-[var(--text-secondary)]">{detail}</p></div>;
}
