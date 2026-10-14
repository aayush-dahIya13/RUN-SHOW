'use client';

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AlertCircle, Check, CheckCircle, Clock, Flag, User, XCircle } from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { api } from '@/lib/api';
import { STATUS_COLORS } from '@/lib/demo-data';
import { Incident, Risk, Role, Task, TaskStatus } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { isTaskOverdue } from '@/lib/event-utils';
import { suggestResponders, type TeamMemberProfile } from '@/lib/team-capabilities';

const STATUS_LABELS: Record<TaskStatus, string> = { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed', blocked: 'Blocked' };
const STATUS_ICONS = { pending: Clock, 'in-progress': AlertCircle, completed: CheckCircle, blocked: XCircle };
const ROLE_WORKFLOW_COPY: Record<Role, string> = {
  marketing: 'Campaigns, registrations, conversion, and content tasks',
  partnerships: 'Sponsors, partner confirmations, and follow-ups',
  operations: 'Venue, catering, equipment, staffing, and logistics',
  programme: 'Speakers, mentors, schedule, and session readiness',
  leadership: 'Overall readiness, critical risks, and escalations',
};

function RoleWorkflowSummary({ role, tasks, risks }: { role: Role; tasks: Task[]; risks: Risk[] }) {
  const roleTasks = role === 'leadership' ? tasks : tasks.filter(task => task.assignee === role);
  const roleRisks = role === 'leadership' ? risks : risks.filter(risk => risk.owner === role);
  const urgentTasks = roleTasks.filter(task => task.priority === 'urgent' || task.priority === 'high').length;
  const blockedTasks = roleTasks.filter(task => task.status === 'blocked').length;
  const openRisks = roleRisks.filter(risk => risk.status === 'open' || risk.status === 'in-progress').length;
  return <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm font-semibold text-[var(--text-primary)]">{role === 'leadership' ? 'Leadership Workflow' : `${role.charAt(0).toUpperCase()}${role.slice(1)} Workflow`}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{ROLE_WORKFLOW_COPY[role]}</p></div>
      <div className="grid min-w-0 grid-cols-3 gap-2 text-center sm:min-w-[260px]"><SummaryMetric value={roleTasks.length} label="Tasks" /><SummaryMetric value={urgentTasks} label="Priority" tone="warning" /><SummaryMetric value={blockedTasks + openRisks} label="Escalations" tone="warning" /></div>
    </div>
  </div>;
}

function SummaryMetric({ value, label, tone }: { value: number; label: string; tone?: 'warning' }) {
  return <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-card)] p-2"><p className={`text-lg font-semibold ${tone === 'warning' ? 'text-[var(--accent-foreground)]' : 'text-[var(--text-primary)]'}`}>{value}</p><p className="text-xs text-[var(--text-muted)]">{label}</p></div>;
}

interface TaskCardProps {
  task: Task;
  eventName: string;
  index: number;
  busy: boolean;
  onClick: () => void;
  onToggle: (task: Task) => void;
  responders: TeamMemberProfile[];
  onAssign: (task: Task, ownerId: string | null) => void;
  canManageAssignment: boolean;
}

function TaskCard({ task, eventName, index, busy, onClick, onToggle, responders, onAssign, canManageAssignment }: TaskCardProps) {
  const reduceMotion = useReducedMotion();
  const completed = task.status === 'completed';
  const StatusIcon = STATUS_ICONS[task.status];
  const overdue = isTaskOverdue(task.deadline, task.status);
  return <motion.div layout initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }} transition={{ duration: reduceMotion ? 0 : 0.18, delay: reduceMotion ? 0 : Math.min(index * 0.02, 0.12) }} className="group" role="listitem">
    <div className={`rounded-xl border p-4 transition-colors duration-200 ${STATUS_COLORS[task.status]} hover:border-[var(--action-primary)]/40 hover:bg-[var(--surface-elevated)]`}>
      <div className="flex items-start gap-3">
        <label className="relative mt-0.5 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full" title={completed ? 'Restore task to active' : 'Mark task complete'}>
          <input type="checkbox" checked={completed} disabled={busy} onChange={() => onToggle(task)} aria-label={`${completed ? 'Restore' : 'Complete'} task: ${task.title}`} className="peer sr-only" />
          <span aria-hidden="true" className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--focus)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--surface-card)] ${completed ? 'border-[var(--action-primary)] bg-[var(--action-primary-fill)] text-[var(--action-primary-foreground)]' : 'border-[var(--text-muted)] bg-[var(--surface-card)] text-transparent hover:border-[var(--action-primary)]'} ${busy ? 'animate-pulse opacity-60' : ''}`}><Check className="h-4 w-4" strokeWidth={3} /></span>
        </label>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2"><h4 className="min-w-0 truncate pr-2"><button type="button" onClick={onClick} aria-label={`Open task ${task.title}`} className={`truncate text-left font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--action-primary)] focus:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${completed ? 'text-[var(--text-secondary)] line-through decoration-[var(--action-primary)]' : ''}`}>{task.title}</button></h4><Badge variant="neutral" size="sm" className={STATUS_COLORS[task.status]}>{STATUS_LABELS[task.status]}</Badge></div>
          <p className={`mt-1 line-clamp-2 text-sm ${completed ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>{task.description}</p>
          <p className="mt-2 truncate text-xs font-medium text-[var(--text-primary)]">Event: {eventName}{task.ownerName ? ` · Assigned to ${task.ownerName}` : ''}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]"><span className="flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" />Due: {new Date(task.deadline).toLocaleDateString()}</span><span className="flex items-center gap-1"><User className="h-3 w-3" aria-hidden="true" />{task.assignee}</span><span className="flex items-center gap-1"><Flag className="h-3 w-3" aria-hidden="true" />{task.priority}</span>{overdue && <span className="rounded border border-[var(--accent)]/60 bg-[var(--accent-muted)] px-2 py-0.5 font-semibold text-[var(--text-primary)]">Overdue</span>}{task.status === 'blocked' && <span className="rounded border border-[var(--border)] bg-[var(--neutral-surface)] px-2 py-0.5 font-semibold text-[var(--text-primary)]">Blocked</span>}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2" onClick={event => event.stopPropagation()}>{canManageAssignment ? <><label className="text-xs text-[var(--text-secondary)]" htmlFor={`task-owner-${task.id}`}>Owner</label><select id={`task-owner-${task.id}`} value={task.ownerId || ''} disabled={busy} onChange={event => onAssign(task, event.target.value || null)} className="min-h-9 max-w-full rounded-full border border-[var(--border)] bg-[var(--surface-card)] px-3 text-xs text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"><option value="">Unassigned</option>{responders.map(responder => <option key={responder.id} value={responder.id}>{responder.name}{responder.responsibility ? ` · ${responder.responsibility}` : ''}</option>)}</select></> : <span className="text-xs text-[var(--text-secondary)]">Owner · select one event to manage assignment</span>}{task.ownerName && <span className="text-xs text-[var(--text-muted)]">Assigned to {task.ownerName}</span>}</div>
        </div>
        <StatusIcon className={`mt-1 h-5 w-5 shrink-0 ${completed ? 'text-[var(--action-primary)]' : task.status === 'blocked' ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]'}`} aria-label={STATUS_LABELS[task.status]} />
      </div>
    </div>
  </motion.div>;
}

function TaskSection({ title, count, tasks, events, busyIds, onClick, onToggle, empty, responders, onAssign, canManageAssignment }: { title: string; count: number; tasks: Task[]; events: { id: string; name: string }[]; busyIds: Set<string>; onClick: (task: Task) => void; onToggle: (task: Task) => void; empty: string; responders: TeamMemberProfile[]; onAssign: (task: Task, ownerId: string | null) => void; canManageAssignment: boolean }) {
  return <section aria-labelledby={`${title.toLowerCase().replaceAll(' ', '-')}-heading`}><div className="mb-3 flex items-center justify-between gap-3"><h3 id={`${title.toLowerCase().replaceAll(' ', '-')}-heading`} className="text-base font-semibold text-[var(--text-primary)]">{title} <span className="text-sm font-normal text-[var(--text-muted)]">({count})</span></h3></div><AnimatePresence mode="popLayout" initial={false}>{tasks.length ? <div className="space-y-3" role="list">{tasks.map((task, index) => <TaskCard key={task.id} task={task} eventName={events.find(item => item.id === task.eventId)?.name ?? 'Unassigned event'} index={index} busy={busyIds.has(task.id)} onClick={() => onClick(task)} onToggle={onToggle} responders={responders} onAssign={onAssign} canManageAssignment={canManageAssignment} />)}</div> : <div className="rounded-lg border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">{empty}</div>}</AnimatePresence></section>;
}

export function Tasks() {
  const { tasks, risks, events, selectedRole, completeTask, openDrawer, updateTaskStatus, setupError, isUsingApi } = useDashboardStore();
  const [statusFilter, setStatusFilter] = React.useState<TaskStatus | 'all'>('all');
  const [eventFilter, setEventFilter] = React.useState('all');
  const [roleFilter, setRoleFilter] = React.useState<Role | 'all'>(selectedRole === 'leadership' ? 'all' : selectedRole);
  const [busyIds, setBusyIds] = React.useState<Set<string>>(new Set());
  const [taskError, setTaskError] = React.useState('');
  const [assigneeFilter, setAssigneeFilter] = React.useState('all');

  const filteredTasks = tasks.filter(task => {
    const roleMatch = roleFilter === 'all' || task.assignee === roleFilter;
    const statusMatch = statusFilter === 'all' || task.status === statusFilter;
    const eventMatch = eventFilter === 'all' || task.eventId === eventFilter;
    const assigneeMatch = assigneeFilter === 'all' || (assigneeFilter === 'unassigned' ? !task.ownerId : task.ownerId === assigneeFilter);
    return roleMatch && statusMatch && eventMatch && assigneeMatch;
  });
  const [quickTitle, setQuickTitle] = React.useState('');
  const [quickDescription, setQuickDescription] = React.useState('');
  const [quickDeadline, setQuickDeadline] = React.useState('');
  const [quickAssignee, setQuickAssignee] = React.useState<Role>('operations');
  const [quickPriority, setQuickPriority] = React.useState<Task['priority']>('medium');
  const [quickResponderId, setQuickResponderId] = React.useState('');
  const [quickCapability, setQuickCapability] = React.useState('');
  const [quickZone, setQuickZone] = React.useState('');
  const [responderProfiles, setResponderProfiles] = React.useState<TeamMemberProfile[]>([]);
  const [followUpIncidents, setFollowUpIncidents] = React.useState<Incident[]>([]);
  const [isAdding, setIsAdding] = React.useState(false);
  const targetEventId = eventFilter !== 'all' ? eventFilter : events[0]?.id || '';
  const targetEventIds = React.useMemo(() => eventFilter !== 'all' ? [eventFilter] : events.map(event => event.id), [eventFilter, events]);

  React.useEffect(() => {
    if (!isUsingApi || !targetEventIds.length) return;
    let cancelled = false;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const loaded = await Promise.all(targetEventIds.map(async eventId => ({ eventId, tasks: await api.getTasks(eventId), incidents: await api.listIncidents(eventId) })));
        if (cancelled) return;
        useDashboardStore.setState(state => ({
          tasks: [...state.tasks.filter(task => !targetEventIds.includes(task.eventId || '')), ...loaded.flatMap(({ eventId, tasks: latest }) => latest.map(task => ({ ...task, eventId })))],
        }));
        setFollowUpIncidents(loaded.flatMap(item => item.incidents));
      } catch {
        // Keep the last successfully loaded task state visible during transient refresh failures.
      } finally { inFlight = false; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [isUsingApi, targetEventId, targetEventIds]);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      setQuickResponderId('');
      if (!targetEventId) { setResponderProfiles([]); return; }
      try {
        const members = await api.listTeamMembers(targetEventId);
        if (!cancelled) setResponderProfiles(members);
      } catch {
        if (!cancelled) setResponderProfiles([]);
      }
    });
    return () => { cancelled = true; };
  }, [targetEventId]);

  const availableTaskResponders = responderProfiles.filter(member => member.role === 'sub_organizer');
  const suggestedResponders = quickCapability.trim() ? suggestResponders(availableTaskResponders.map(member => ({
    id: member.id,
    name: member.name,
    availability: member.availability,
    zones: member.zones.split(',').map(zone => zone.trim()).filter(Boolean),
    activeIncidents: member.performance.openIncidents,
    activeTasks: member.performance.tasksActive,
    capabilities: member.capabilities,
    legacySkills: member.skills.split(',').map(skill => skill.trim()).filter(Boolean),
  })), quickCapability, quickZone).slice(0, 3) : [];

  // Operational urgency sorting:
  // 1. Critical incident/urgent priority
  // 2. Overdue tasks
  // 3. Imminent deadlines (next 48h)
  // 4. Other
  const sortOperational = (a: Task, b: Task) => {
    const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
    const aOverdue = isTaskOverdue(a.deadline, a.status);
    const bOverdue = isTaskOverdue(b.deadline, b.status);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    if (pDiff !== 0) return pDiff;

    return (a.deadline || '').localeCompare(b.deadline || '');
  };

  const activeTasks = [...filteredTasks.filter(task => task.status !== 'completed')].sort(sortOperational);
  const doneTasks = filteredTasks.filter(task => task.status === 'completed');
  const workflowRisks = risks.filter(risk => eventFilter === 'all' || risk.eventId === eventFilter);
  const activeCount = activeTasks.length;
  const completedCount = doneTasks.length;

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || isAdding) return;
    setIsAdding(true);
    setTaskError('');
    try {
      if (!targetEventId) throw new Error('Choose an event before adding a task.');
      const created = await api.createTask(targetEventId, {
        title: quickTitle.trim(),
        description: quickDescription.trim(),
        assignee: quickAssignee,
        priority: quickPriority,
        status: 'pending',
        deadline: quickDeadline || new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
        ownerId: quickResponderId || undefined,
        requestId: crypto.randomUUID(),
      });
      useDashboardStore.setState(state => ({
        tasks: [created, ...state.tasks],
      }));
      setQuickTitle('');
      setQuickDescription('');
      setQuickDeadline('');
    } catch (err: unknown) {
      setTaskError(err instanceof Error ? err.message : 'Failed to add task');
    } finally {
      setIsAdding(false);
    }
  };

  const toggleTask = async (task: Task) => {
    if (busyIds.has(task.id)) return;
    const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    setTaskError('');
    setBusyIds(previous => new Set(previous).add(task.id));
    try {
      if (isUsingApi) {
        const updated = await api.updateTask(task.id, { status: nextStatus, requestId: crypto.randomUUID() });
        useDashboardStore.setState(state => ({ tasks: state.tasks.map(item => item.id === task.id ? { ...item, ...updated } : item) }));
      } else if (nextStatus === 'completed') await completeTask(task.id);
      else await updateTaskStatus(task.id, nextStatus);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'The task could not be updated. Your change was not saved.');
    } finally {
      setBusyIds(previous => { const next = new Set(previous); next.delete(task.id); return next; });
    }
  };

  const assignTask = async (task: Task, ownerId: string | null) => {
    if (busyIds.has(task.id)) return;
    setBusyIds(previous => new Set(previous).add(task.id));
    setTaskError('');
    try {
      const updated = await api.updateTask(task.id, { ownerId, requestId: crypto.randomUUID() });
      useDashboardStore.setState(state => ({ tasks: state.tasks.map(item => item.id === task.id ? { ...item, ...updated } : item) }));
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'The assignment was not saved.');
    } finally {
      setBusyIds(previous => { const next = new Set(previous); next.delete(task.id); return next; });
    }
  };

  const createIncidentFollowUp = async (incident: Incident, requestTime: number) => {
    if (isAdding) return;
    setIsAdding(true);
    setTaskError('');
    try {
      const created = await api.createTask(targetEventId, {
        title: `Follow up: ${incident.title}`,
        description: `Organizer review required for incident ${incident.referenceNumber}. Keep incident handling and its history in the Incident Desk.`,
        priority: incident.urgency === 'critical' ? 'urgent' : incident.urgency === 'high' ? 'high' : 'medium',
        status: 'pending',
        deadline: new Date(requestTime + 86400000).toISOString(),
        relatedIncidentId: incident.id,
        requestId: crypto.randomUUID(),
      });
      useDashboardStore.setState(state => ({ tasks: [created, ...state.tasks.filter(task => task.id !== created.id)] }));
      setFollowUpIncidents(previous => previous.filter(item => item.id !== incident.id));
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'The follow-up task was not saved.');
    } finally { setIsAdding(false); }
  };

  return (
    <Card variant="glass" padding="none" className="flex h-full flex-col">
      <CardHeader className="p-6 pb-0">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle>Tasks</CardTitle>
            <CardDescription>{activeCount} active, {completedCount} completed</CardDescription>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[0.045] p-3 transition-colors hover:border-emerald-500/35 focus-within:border-emerald-500/45">
              <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Event</span>
              <Select value={eventFilter} onChange={event => setEventFilter(event.target.value)} options={[{ value: 'all', label: 'All Events' }, ...events.map(item => ({ value: item.id, label: item.name }))]} className="h-10 min-h-10 min-w-0 py-2 text-sm" aria-label="Filter tasks by event" />
            </div>
            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-teal-500/20 bg-teal-500/[0.045] p-3 transition-colors hover:border-teal-500/35 focus-within:border-teal-500/45">
              <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Status</span>
              <Select value={statusFilter} onChange={event => setStatusFilter(event.target.value as TaskStatus | 'all')} options={[{ value: 'all', label: 'All Statuses' }, { value: 'pending', label: 'Pending' }, { value: 'in-progress', label: 'In Progress' }, { value: 'completed', label: 'Done' }, { value: 'blocked', label: 'Blocked' }]} className="h-10 min-h-10 min-w-0 py-2 text-sm" aria-label="Filter tasks by status" />
            </div>
            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-400/20 bg-slate-500/[0.045] p-3 transition-colors hover:border-slate-400/35 focus-within:border-slate-400/45">
              <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Role</span>
              <Select value={roleFilter} onChange={event => setRoleFilter(event.target.value as Role | 'all')} options={[{ value: 'all', label: 'All Roles' }, { value: 'marketing', label: 'Marketing' }, { value: 'partnerships', label: 'Partnerships' }, { value: 'operations', label: 'Operations' }, { value: 'programme', label: 'Programme' }, { value: 'leadership', label: 'Leadership' }]} className="h-10 min-h-10 min-w-0 py-2 text-sm" aria-label="Filter tasks by role" />
            </div>
            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-cyan-500/20 bg-cyan-500/[0.045] p-3 transition-colors hover:border-cyan-500/35 focus-within:border-cyan-500/45">
              <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Assignee</span>
              <Select value={assigneeFilter} onChange={event => setAssigneeFilter(event.target.value)} options={[{ value: 'all', label: 'All assignees' }, { value: 'unassigned', label: 'Unassigned' }, ...availableTaskResponders.map(member => ({ value: member.id, label: member.name }))]} className="h-10 min-h-10 min-w-0 py-2 text-sm" aria-label="Filter tasks by assigned responder" disabled={!isUsingApi} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-6 p-6 pt-5">
        {(taskError || setupError) && <p className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger-surface)] px-3 py-2 text-sm text-[var(--danger)]" role="alert">{taskError || setupError}</p>}
        <RoleWorkflowSummary role={roleFilter === 'all' ? selectedRole : roleFilter} tasks={filteredTasks} risks={workflowRisks} />
        <TaskSection title="Active Tasks" count={activeCount} tasks={activeTasks} events={events} busyIds={busyIds} onClick={task => openDrawer(task, 'task')} onToggle={toggleTask} empty={filteredTasks.length ? 'No active tasks match these filters.' : 'No active tasks yet.'} responders={availableTaskResponders} onAssign={assignTask} canManageAssignment={isUsingApi && eventFilter !== 'all'} />
        
        {/* Quick-add task bar */}
        <form onSubmit={handleQuickAdd} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">Quick Add Operational Task</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              placeholder="What needs to get done? (Press Enter to add)"
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
            />
            <div className="flex gap-2">
              <select
                value={quickAssignee}
                onChange={e => setQuickAssignee(e.target.value as Role)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-2.5 py-2 text-xs font-medium text-[var(--text-primary)]"
                aria-label="Assignee"
              >
                <option value="operations">Operations</option>
                <option value="marketing">Marketing</option>
                <option value="partnerships">Partnerships</option>
                <option value="programme">Programme</option>
                <option value="leadership">Leadership</option>
              </select>
              <select
                value={quickPriority}
                onChange={e => setQuickPriority(e.target.value as Task['priority'])}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-2.5 py-2 text-xs font-medium text-[var(--text-primary)]"
                aria-label="Priority"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button
                type="submit"
                disabled={!quickTitle.trim() || isAdding}
                className="rounded-lg bg-[var(--action-primary-fill)] px-4 py-2 text-xs font-semibold text-[var(--action-primary-foreground)] hover:opacity-90 disabled:opacity-50"
              >
                {isAdding ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><textarea value={quickDescription} onChange={event => setQuickDescription(event.target.value)} maxLength={5000} rows={2} placeholder="Description or completion expectation (optional)" aria-label="Task description" className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"/><label className="text-xs text-[var(--text-secondary)]">Due date<input type="date" value={quickDeadline} onChange={event => setQuickDeadline(event.target.value)} aria-label="Task due date" className="mt-1 block min-h-10 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)]"/></label></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input value={quickCapability} onChange={event => setQuickCapability(event.target.value)} maxLength={80} placeholder="Required capability (optional)" aria-label="Required capability for responder suggestions" className="rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
            <input value={quickZone} onChange={event => setQuickZone(event.target.value)} maxLength={80} placeholder="Zone (optional)" aria-label="Task zone for responder suggestions" className="rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="quick-task-responder">Assign to sub-organizer</label>
            <select id="quick-task-responder" value={quickResponderId} onChange={event => setQuickResponderId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--text-primary)]">
              <option value="">No individual responder</option>
              {availableTaskResponders.map(member => <option key={member.id} value={member.id}>{member.name} · {member.responsibility}</option>)}
            </select>
            {availableTaskResponders.length === 0 && <p className="text-[11px] text-[var(--text-muted)]">No sub-organizers are assigned to this event; the existing role assignment remains in effect.</p>}
          </div>
          {suggestedResponders.length > 0 && <section className="mt-3 rounded-lg border border-[var(--divider)] p-3" aria-label="Suggested responders">
            <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Suggested Responders · choose to select, never auto-assigned</p>
            <div className="grid gap-2 sm:grid-cols-3">{suggestedResponders.map(responder => <button key={responder.id} type="button" onClick={() => setQuickResponderId(responder.id)} aria-pressed={quickResponderId === responder.id} className={`rounded-md border p-2 text-left focus:outline-none focus:ring-2 focus:ring-[var(--focus)] ${quickResponderId === responder.id ? 'border-[var(--action-primary)] bg-[var(--success-surface)]/50' : 'border-[var(--divider)] hover:bg-[var(--surface-elevated)]'}`}><span className="block text-xs font-semibold text-[var(--text-primary)]">{responder.name}</span><span className="mt-1 block text-[10px] text-[var(--text-secondary)]">{responder.reason}</span></button>)}</div>
          </section>}
        </form>

        {isUsingApi && (() => {
          const linkedIncidents = new Set(tasks.filter(task => task.eventId === targetEventId).map(task => task.relatedIncidentId).filter(Boolean));
          const needsFollowUp = followUpIncidents.filter(incident => !['resolved', 'closed'].includes(incident.status) && !linkedIncidents.has(incident.id));
          return <section className="space-y-3" aria-labelledby="incident-follow-up-heading"><div><h3 id="incident-follow-up-heading" className="text-base font-semibold">Operational issues needing task ownership</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Create a linked, unassigned organizer follow-up. Incident history remains in the Incident Desk.</p></div>{needsFollowUp.length ? needsFollowUp.map(incident => <div key={incident.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--divider)] bg-[var(--surface-card)] p-3"><div><p className="text-sm font-medium">{incident.referenceNumber} · {incident.title}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{incident.urgency} · {incident.status} · {incident.zone || 'No zone recorded'}</p></div><button type="button" disabled={isAdding} onClick={() => void createIncidentFollowUp(incident, Date.now())} className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-medium transition-colors hover:border-[var(--action-primary)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-50">{isAdding ? 'Saving…' : 'Create unassigned task'}</button></div>) : <p className="rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-secondary)]">No unlinked open incidents need organizer follow-up.</p>}</section>;
        })()}

        <TaskSection title="Done" count={completedCount} tasks={doneTasks} events={events} busyIds={busyIds} onClick={task => openDrawer(task, 'task')} onToggle={toggleTask} empty="Completed tasks will appear here." responders={availableTaskResponders} onAssign={assignTask} canManageAssignment={isUsingApi && eventFilter !== 'all'} />
      </CardContent>
    </Card>
  );
}
