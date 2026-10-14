'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, CheckCircle, Clock, User, Flag, AlertTriangle, Target, ArrowRight, LoaderCircle, CalendarClock } from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { Task, DrawerState, TaskStatus } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PRIORITY_COLORS, STATUS_COLORS } from '@/lib/demo-data';
import { api } from '@/lib/api';
import type { TeamMemberProfile } from '@/lib/team-capabilities';

type TaskDetail = Task & { eventName?: string; linkedIncident?: { id: string; referenceNumber: string; title: string } | null };
const PRIORITY_LABELS: Record<Task['priority'], string> = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };
const STATUS_LABELS: Record<TaskStatus, string> = { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed', blocked: 'Blocked' };

interface TaskDrawerProps { state: DrawerState; onClose: () => void }

export function TaskDrawerContent({ state, onClose }: TaskDrawerProps) {
  const store = useDashboardStore();
  const reduceMotion = useReducedMotion();
  const [detail, setDetail] = useState<TaskDetail | null>(state.task);
  const [membersState, setMembersState] = useState<{ eventId: string; members: TeamMemberProfile[] } | null>(null);
  const [selectedOwner, setSelectedOwner] = useState(state.task?.ownerId || '');
  const [status, setStatus] = useState<TaskStatus>(state.task?.status || 'pending');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const taskId = state.task?.id;
  const taskEventId = detail && detail.id === taskId ? detail.eventId : state.task?.eventId;
  const members = membersState && membersState.eventId === taskEventId ? membersState.members : [];
  const event = store.events.find(item => item.id === taskEventId);
  const completed = detail?.status === 'completed';

  useEffect(() => {
    if (!state.isOpen || !taskId) return;
    let cancelled = false;
    if (!store.isUsingApi) return;
    void Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
      return api.getTask(taskId);
    }).then(fresh => {
      if (cancelled) return;
      setDetail(fresh);
      setSelectedOwner(fresh.ownerId || '');
      setStatus(fresh.status);
      useDashboardStore.setState(current => ({
        tasks: current.tasks.map(item => item.id === fresh.id ? { ...item, ...fresh } : item),
        drawer: { ...current.drawer, task: { ...current.drawer.task!, ...fresh } },
      }));
    }).catch(reason => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load saved task details.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [state.isOpen, taskId, store.isUsingApi]);

  useEffect(() => {
    if (!state.isOpen || !taskEventId || !store.isUsingApi) return;
    let cancelled = false;
    void api.listTeamMembers(taskEventId).then(list => { if (!cancelled) setMembersState({ eventId: taskEventId, members: list.filter(person => person.role === 'sub_organizer' && person.assignment_status === 'active') }); })
      .catch(() => { if (!cancelled) setMembersState({ eventId: taskEventId, members: [] }); });
    return () => { cancelled = true; };
  }, [state.isOpen, taskEventId, store.isUsingApi]);

  const task = detail && detail.id === taskId ? detail : state.task;
  if (!task) return null;
  const closeSafely = () => {
    if (busy) return;
    if (note.trim() && !window.confirm('Discard the unsaved progress note?')) return;
    onClose();
  };
  const assignedMember = task.ownerId ? members.find(member => member.id === task.ownerId) : undefined;
  const persist = async (updates: Parameters<typeof api.updateTask>[1], message: string) => {
    if (busy || !store.isUsingApi) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const saved = await api.updateTask(task.id, { ...updates, requestId: crypto.randomUUID() });
      const fresh = await api.getTask(task.id);
      setDetail(fresh);
      setSelectedOwner(fresh.ownerId || '');
      setStatus(fresh.status);
      setNote(''); setSuccess(message);
      useDashboardStore.setState(current => ({
        tasks: current.tasks.map(item => item.id === task.id ? { ...item, ...saved, ...fresh } : item),
        drawer: { ...current.drawer, task: { ...current.drawer.task!, ...saved, ...fresh } },
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The task update was not saved.');
    } finally { setBusy(false); }
  };

  const formatDate = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : 'Not recorded';
  const saveAssignment = () => {
    if (!selectedOwner && task.ownerId) return void persist({ ownerId: null }, 'Task returned to the unassigned queue.');
    if (!selectedOwner) { setError('Select an active sub-organizer or keep this task unassigned.'); return; }
    if (!members.some(member => member.id === selectedOwner)) { setError('That responder is not an active member of this event.'); return; }
    void persist({ ownerId: selectedOwner }, 'Assignment saved.');
  };

  return <AnimatePresence>
    {state.isOpen && <>
      <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.18 }} className="fixed inset-0 z-50 bg-[var(--metallic-black)]/50" onClick={closeSafely} aria-hidden="true" />
      <motion.aside initial={reduceMotion ? false : { x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }} className="fixed right-0 top-0 z-50 flex h-dvh w-full max-w-2xl flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--surface-card)]" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--divider)] p-4 sm:p-6">
          <div className="min-w-0 flex-1 pr-4"><div className="mb-2 flex items-center gap-2"><span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">{state.type}</span><Badge variant="neutral" size="sm" className={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge></div><h2 id="drawer-title" className="text-xl font-bold text-[var(--text-primary)]">{task.title}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{detail?.eventName || event?.name || 'Event task'}</p></div>
          <Button variant="ghost" size="sm" onClick={closeSafely} disabled={busy} aria-label="Close task details"><X className="h-5 w-5" aria-hidden="true" /></Button>
        </div>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {loading && <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]" role="status"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true"/>Refreshing saved task details…</p>}
          {error && <p className="rounded-lg border border-[var(--danger)]/40 bg-[var(--danger-surface)] p-3 text-sm text-[var(--danger)]" role="alert">{error}</p>}
          {success && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-[var(--text-primary)]" role="status">{success}</p>}
          {!store.isUsingApi && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-[var(--text-secondary)]">Task changes require API mode. No updates have been saved.</p>}
          <section><h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Description</h3><p className="whitespace-pre-wrap leading-relaxed text-[var(--text-primary)]">{task.description || 'No description provided.'}</p></section>
          <dl className="grid grid-cols-1 gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 sm:grid-cols-2">
            <div><dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Assignee</dt><dd className="mt-1 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"><User className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true"/>{task.ownerName || 'Unassigned'}{task.functionName ? ` · ${task.functionName}` : ''}</dd>{assignedMember && <p className="mt-1 pl-6 text-xs text-[var(--text-secondary)]">{assignedMember.email} · {assignedMember.availability}</p>}</div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Due</dt><dd className="mt-1 flex items-center gap-2 text-sm text-[var(--text-primary)]"><Clock className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true"/>{formatDate(task.deadline)}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Status</dt><dd className="mt-1"><Badge variant="neutral" size="sm" className={STATUS_COLORS[task.status]}>{STATUS_LABELS[task.status]}</Badge></dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Priority</dt><dd className="mt-1 flex items-center gap-2 text-sm text-[var(--text-primary)]"><Flag className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true"/>{PRIORITY_LABELS[task.priority]}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Created</dt><dd className="mt-1 text-sm text-[var(--text-primary)]">{formatDate(task.createdAt)}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Last updated</dt><dd className="mt-1 text-sm text-[var(--text-primary)]">{formatDate(task.updatedAt)}</dd></div>
            {task.assignedAt && <div><dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Assigned</dt><dd className="mt-1 text-sm text-[var(--text-primary)]">{formatDate(task.assignedAt)}</dd></div>}
            {task.completedAt && <div><dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Completed</dt><dd className="mt-1 flex items-center gap-1 text-sm text-[var(--text-primary)]"><CalendarClock className="h-4 w-4" aria-hidden="true"/>{formatDate(task.completedAt)}</dd></div>}
          </dl>

          {store.isUsingApi && state.type === 'task' && <section className="space-y-4 rounded-xl border border-[var(--border)] p-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Organizer controls</h3>
            <div><label htmlFor="task-detail-assignee" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Assign to an active event sub-organizer</label><select id="task-detail-assignee" value={selectedOwner} onChange={event => setSelectedOwner(event.target.value)} disabled={busy || loading} className="min-h-10 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"><option value="">Unassigned</option>{members.map(member => <option key={member.id} value={member.id}>{member.name} · {member.email}{member.responsibility ? ` · ${member.responsibility}` : ''} · {member.availability}</option>)}</select><p className="mt-1 text-xs text-[var(--text-muted)]">Only active sub-organizers assigned to this event are selectable.</p></div>
            <Button variant="secondary" size="sm" disabled={busy || loading || (selectedOwner || '') === (task.ownerId || '')} onClick={saveAssignment}>{busy ? 'Saving…' : selectedOwner ? task.ownerId ? 'Save reassignment' : 'Assign task' : 'Remove assignment'}</Button>
            <div><label htmlFor="task-detail-status" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Task status</label><div className="flex flex-col gap-2 sm:flex-row"><select id="task-detail-status" value={status} onChange={event => setStatus(event.target.value as TaskStatus)} disabled={busy || loading} className="min-h-10 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]">{Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><Button variant="secondary" size="sm" disabled={busy || loading || status === task.status} onClick={() => void persist({ status, progressNote: note.trim() || undefined }, 'Task status saved.')}>Save status</Button></div></div>
            <div><label htmlFor="task-detail-note" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Progress or completion note</label><textarea id="task-detail-note" value={note} onChange={event => setNote(event.target.value)} maxLength={2000} rows={3} disabled={busy} placeholder="Add context for the assignee or record the completion summary." className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-card)] p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"/><Button className="mt-2" variant="secondary" size="sm" disabled={busy || !note.trim()} onClick={() => void persist({ progressNote: note.trim() }, 'Progress note saved.')}>Add progress note</Button></div>
          </section>}

          {detail?.linkedIncident && <section className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true"/>Related incident</h3><p className="mt-2 text-sm text-[var(--text-primary)]">{detail.linkedIncident.referenceNumber} · {detail.linkedIncident.title}</p><button type="button" className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--action-primary)] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]" onClick={() => { store.selectEvent(task.eventId || ''); store.setSelectedView('incidents'); onClose(); }}>Open Incident Desk <ArrowRight className="h-3.5 w-3.5" aria-hidden="true"/></button></section>}
          {task.relatedRiskId && <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4"><h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"><AlertTriangle className="h-4 w-4 text-[var(--danger)]" aria-hidden="true"/>Related risk</h3><p className="mt-2 text-sm text-[var(--text-secondary)]">{task.relatedRiskId}</p></section>}
          {task.relatedRecommendationId && <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4"><h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"><Target className="h-4 w-4 text-[var(--action-primary)]" aria-hidden="true"/>Related recommendation</h3><p className="mt-2 text-sm text-[var(--text-secondary)]">{task.relatedRecommendationId}</p></section>}
          <section className="space-y-3" aria-label="Task progress history"><h3 className="text-sm font-semibold text-[var(--text-primary)]">Progress updates</h3>{task.comments?.length ? task.comments.map(comment => <article key={comment.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3"><p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{comment.content}</p><p className="mt-2 text-xs text-[var(--text-muted)]">{comment.userName} · {formatDate(comment.createdAt)}</p></article>) : <p className="text-sm text-[var(--text-muted)]">No progress notes have been recorded.</p>}</section>
          <section className="space-y-2" aria-label="Task activity timeline"><h3 className="text-sm font-semibold text-[var(--text-primary)]">Assignment and status history</h3>{task.activities?.length ? [...task.activities].reverse().map(activity => <article key={activity.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3"><p className="text-sm font-medium capitalize text-[var(--text-primary)]">{activity.action.replaceAll('_', ' ')}</p>{activity.details && <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{activity.details}</p>}<p className="mt-1 text-xs text-[var(--text-muted)]">{activity.actorName} · {formatDate(activity.createdAt)}</p></article>) : <p className="text-sm text-[var(--text-muted)]">No activity history is available.</p>}</section>
          {completed && <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--action-primary)]/30 bg-[var(--success-surface)] p-4 text-[var(--action-primary)]"><CheckCircle className="h-5 w-5" aria-hidden="true"/><span className="font-medium">Task completed{task.completedAt ? ` · ${formatDate(task.completedAt)}` : ''}</span></div>}
        </div>
      </motion.aside>
    </>}
  </AnimatePresence>;
}
