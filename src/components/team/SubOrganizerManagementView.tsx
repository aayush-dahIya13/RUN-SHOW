'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useDashboardStore } from '@/lib/dashboard-state';
import { AddSubOrganizerWizard } from './TeamDirectory';

interface ManagedSubOrganizer {
  id: string;
  name: string;
  email: string;
  accountStatus: string;
  membershipStatus: string;
  responsibility: string;
  responsibilities: string[];
  zones: string | null;
  assignedAt: string;
}

export function SubOrganizerManagementView() {
  const events = useDashboardStore(state => state.events);
  const selectedEventId = useDashboardStore(state => state.selectedEventId);
  const isUsingApi = useDashboardStore(state => state.isUsingApi);
  const setSelectedView = useDashboardStore(state => state.setSelectedView);
  const [requestedEventId, setRequestedEventId] = useState(selectedEventId);
  const [members, setMembers] = useState<ManagedSubOrganizer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const event = events.find(item => item.id === requestedEventId) ?? events[0];
  const eventId = event?.id ?? '';

  const load = useCallback(async () => {
    if (!eventId || !isUsingApi) {
      setMembers([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/sub-organizers`, { credentials: 'include', cache: 'no-store' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || 'Could not load sub-organizers.');
      setMembers(Array.isArray(body) ? body : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load sub-organizers.');
    } finally {
      setLoading(false);
    }
  }, [eventId, isUsingApi]);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => { if (mounted) void load(); });
    return () => { mounted = false; };
  }, [load]);

  return <div className="mx-auto w-full max-w-5xl space-y-5">
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><h2 className="text-2xl font-semibold text-[var(--text-primary)]">Sub-Organizers</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Create event-scoped accounts and review their access.</p></div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading || !event} aria-label="Refresh sub-organizers"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
        <Button type="button" onClick={() => setShowCreate(true)} disabled={!isUsingApi || !event}><UserPlus className="h-4 w-4" />Create Sub-Organizer</Button>
      </div>
    </header>

    {!isUsingApi && <Card padding="md"><p className="text-sm text-[var(--text-secondary)]">Persistent account management requires API mode. Enable the server API; demo/browser accounts are not created here.</p></Card>}
    {!events.length && <Card padding="lg" className="text-center"><Users className="mx-auto h-9 w-9 text-[var(--text-muted)]"/><h3 className="mt-3 font-semibold text-[var(--text-primary)]">Create an event first</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Sub-organizer accounts must be assigned to an event you own.</p><Button className="mt-4" onClick={() => setSelectedView('setup')}>Create Event</Button></Card>}

    {!!events.length && <>
      <Card padding="md">
        <label className="block max-w-xl text-sm font-medium text-[var(--text-primary)]" htmlFor="sub-organizer-event">Parent event</label>
        <select id="sub-organizer-event" value={event?.id ?? ''} onChange={item => setRequestedEventId(item.target.value)} className="mt-2 w-full rounded-lg border border-[var(--divider)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]">
          {events.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">Accounts and memberships are stored in SQLite. A new user can sign in immediately with the email and password set during creation.</p>
      </Card>

      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">{error}</p>}
      {success && <p role="status" className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm text-green-400">{success}</p>}
      <Card padding="md">
        <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-[var(--text-primary)]">Event access</h3><p className="mt-1 text-xs text-[var(--text-secondary)]">{event?.name} · {members.length} account assignment{members.length === 1 ? '' : 's'}</p></div>{loading && <RefreshCw className="h-4 w-4 animate-spin text-[var(--text-muted)]" aria-label="Loading"/>}</div>
        <div className="mt-4 divide-y divide-[var(--divider)]">
          {members.map(member => <article key={member.id + member.membershipStatus + member.assignedAt} className="flex flex-col justify-between gap-3 py-4 first:pt-0 sm:flex-row sm:items-start">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-medium text-[var(--text-primary)]">{member.name}</h4><StatusBadge value={member.accountStatus} label="Account"/><StatusBadge value={member.membershipStatus} label="Event access"/></div><p className="mt-1 break-all text-sm text-[var(--text-secondary)]">{member.email}</p><p className="mt-2 text-sm text-[var(--text-primary)]">{member.responsibility}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Responsibilities: {member.responsibilities.length ? member.responsibilities.join(', ') : 'Not specified'} · Zones: {member.zones || 'All zones'}</p></div>
            <time className="shrink-0 text-xs text-[var(--text-muted)]" dateTime={member.assignedAt}>Assigned {new Date(member.assignedAt).toLocaleDateString()}</time>
          </article>)}
          {!loading && members.length === 0 && <div className="py-8 text-center"><Users className="mx-auto h-8 w-8 text-[var(--text-muted)]"/><p className="mt-2 text-sm text-[var(--text-secondary)]">No sub-organizers assigned to this event yet.</p><p className="mt-1 text-xs text-[var(--text-muted)]">Create one to grant access, or use Team &amp; Responders to manage invitation-based access.</p></div>}
        </div>
      </Card>
    </>}

    {showCreate && event && <AddSubOrganizerWizard eventId={event.id} onClose={() => setShowCreate(false)} onCreated={() => { setSuccess('Account and event membership were saved. The sub-organizer can now sign in using the email and password entered during creation.'); void load(); }} />}
  </div>;
}

function StatusBadge({ value, label }: { value: string; label: string }) {
  const active = value === 'active';
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${active ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-[var(--divider)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]'}`}>{label}: {value.replaceAll('_', ' ')}</span>;
}
