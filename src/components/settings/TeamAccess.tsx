'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Plus, Save, UserPlus, UserRoundX } from 'lucide-react';
import { createDemoSubOrganizer, DemoAccountRecord, setDemoAccountActive, useDemoAccounts } from '@/lib/demo-auth';
import { useDashboardStore } from '@/lib/dashboard-state';
import { Role, TeamAssignment } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';

const FUNCTIONS = ['Gaming', 'Orientation', 'Food & Catering', 'Speaker Coordination', 'Venue Operations', 'Marketing', 'Partnerships', 'Programme Coordination', '__custom'];
const RESPONSIBILITIES: { value: Role; label: string }[] = [
  { value: 'marketing', label: 'Marketing' }, { value: 'partnerships', label: 'Partnerships' },
  { value: 'operations', label: 'Operations' }, { value: 'programme', label: 'Programme' },
  { value: 'leadership', label: 'Leadership' },
];

export function TeamAccess() {
  const accounts = useDemoAccounts().filter(account => account.role === 'sub_organizer' && account.createdAt !== 'seeded');
  const { events, teamAssignments, saveTeamAssignment } = useDashboardStore();
  const [accountId, setAccountId] = useState('new');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [eventId, setEventId] = useState(events[0]?.id ?? '');
  const [functionName, setFunctionName] = useState(FUNCTIONS[0]);
  const [customFunction, setCustomFunction] = useState('');
  const [responsibilities, setResponsibilities] = useState<Role[]>(['operations', 'programme']);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(''), 6000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const assignments = useMemo(() => teamAssignments.filter(item => accounts.some(account => account.id === item.accountId)), [teamAssignments, accounts]);
  const selectedAccount = accounts.find(account => account.id === accountId);

  function editAssignment(assignment: TeamAssignment) {
    setEditingId(assignment.id);
    setAccountId(assignment.accountId);
    setEventId(assignment.eventId);
    const isPreset = FUNCTIONS.includes(assignment.functionName);
    setFunctionName(isPreset ? assignment.functionName : '__custom');
    setCustomFunction(isPreset ? '' : assignment.functionName);
    setResponsibilities(assignment.responsibilities);
    setCredential(null);
    setMessage('');
    setError('');
  }

  function beginNewAssignment(id = 'new') {
    setEditingId(null);
    setAccountId(id);
    setEventId(events[0]?.id ?? '');
    setFunctionName(FUNCTIONS[0]);
    setCustomFunction('');
    setResponsibilities(['operations', 'programme']);
    setCredential(null);
    setMessage('');
    setError('');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      if (functionName === '__custom' && !customFunction.trim()) throw new Error('Enter a name for the custom event function.');
      let resolvedAccountId = accountId;
      if (accountId === 'new') {
        const created = await createDemoSubOrganizer(name, email);
        resolvedAccountId = created.account.id;
        setCredential({ email: created.account.email, password: created.password });
      }
      const existing = teamAssignments.find(item => item.id === editingId);
      const next: TeamAssignment = {
        id: editingId ?? `assignment-${crypto.randomUUID()}`,
        accountId: resolvedAccountId,
        eventId,
        functionName: functionName === '__custom' ? customFunction.trim() : functionName,
        responsibilities,
        active: existing?.active ?? true,
      };
      saveTeamAssignment(next);
      setAccountId(resolvedAccountId);
      setName('');
      setEmail('');
      setEditingId(null);
      setMessage(editingId ? 'Assignment updated.' : 'Assignment saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this account.');
    } finally {
      setBusy(false);
    }
  }

  function toggleResponsibility(role: Role) {
    setResponsibilities(current => current.includes(role) ? current.filter(item => item !== role) : [...current, role]);
  }

  return <section className="space-y-4" aria-labelledby="team-access-title">
    <div><h2 id="team-access-title" className="runshow-scroll-heading text-2xl font-semibold text-[var(--text-primary)]">Team &amp; Access</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Create local accounts and assign them event functions. Assignments reference shared event IDs.</p></div>
    <Card padding="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" /><h3 className="font-semibold text-[var(--text-primary)]">{editingId ? 'Edit assignment' : 'Create account or assign function'}</h3></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Sub-organizer account" value={accountId} onChange={event => { setAccountId(event.target.value); setEditingId(null); }} options={[{ value: 'new', label: 'Create a new account' }, ...accounts.map(account => ({ value: account.id, label: `${account.name}${account.active ? '' : ' (Inactive)'}` }))]} />
          {accountId === 'new' ? <Input label="Name" required value={name} onChange={event => setName(event.target.value)} /> : <div className="flex items-end"><p className="pb-2 text-sm text-[var(--text-secondary)]">{selectedAccount?.email}</p></div>}
          {accountId === 'new' && <Input label="Email" type="email" required value={email} onChange={event => setEmail(event.target.value)} />}
          <Select label="Parent event" value={eventId} onChange={event => setEventId(event.target.value)} options={events.map(item => ({ value: item.id, label: item.name }))} />
          <Select label="Event function" value={functionName} onChange={event => setFunctionName(event.target.value)} options={FUNCTIONS.map(value => ({ value, label: value === '__custom' ? 'Other (custom)' : value }))} />
          {functionName === '__custom' && <Input label="Custom function" required value={customFunction} onChange={event => setCustomFunction(event.target.value)} placeholder="Workshop coordination" />}
        </div>
        <fieldset><legend className="text-sm font-medium text-[var(--text-primary)]">Permitted functional responsibilities</legend><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">{RESPONSIBILITIES.map(item => <label key={item.value} className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]"><input type="checkbox" checked={responsibilities.includes(item.value)} onChange={() => toggleResponsibility(item.value)} className="h-4 w-4 accent-[var(--action-primary)] focus:ring-[var(--focus)]" />{item.label}</label>)}</div></fieldset>
        {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
        {message && <p role="status" className="text-sm text-[var(--action-primary)]">{message}</p>}
        {credential && <div className="rounded-md border border-[var(--accent)]/60 bg-[var(--accent-muted)] p-4"><p className="font-semibold text-[var(--text-primary)]">One-time sign-in details</p><p className="mt-1 text-sm text-[var(--text-primary)]">Email: <code>{credential.email}</code></p><p className="text-sm text-[var(--text-primary)]">Temporary password: <code>{credential.password}</code></p><p className="mt-2 text-xs text-[var(--text-secondary)]">No invitation email is sent. The password is shown only now and is not saved in browser storage; share it through your own channel.</p><Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => navigator.clipboard?.writeText(`${credential.email}\n${credential.password}`)}><Copy className="h-4 w-4" aria-hidden="true" />Copy sign-in details</Button></div>}
        <div className="flex flex-wrap gap-2"><Button type="submit" loading={busy} disabled={!eventId || responsibilities.length === 0}>{editingId ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}{editingId ? 'Save assignment' : accountId === 'new' ? 'Create and assign' : 'Add assignment'}</Button>{editingId && <Button type="button" variant="secondary" onClick={() => beginNewAssignment(accountId)}>Cancel edit</Button>}</div>
      </form>
    </Card>

    <Card padding="md">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-[var(--text-primary)]">Sub-organizer accounts</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">{accounts.length} account{accounts.length === 1 ? '' : 's'}</p></div><Button type="button" variant="secondary" size="sm" onClick={() => beginNewAssignment()}><Plus className="h-4 w-4" aria-hidden="true" />New account</Button></div>
      <div className="mt-4 divide-y divide-[var(--divider)]">{accounts.map(account => <AccountRow key={account.id} account={account} assignments={assignments.filter(item => item.accountId === account.id)} events={events} onEdit={editAssignment} onAdd={() => beginNewAssignment(account.id)} onActiveChange={active => { try { setDemoAccountActive(account.id, active); setMessage(active ? 'Account activated.' : 'Account deactivated.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update account.'); } }} />)}</div>
      {!accounts.length && <p className="mt-4 text-sm text-[var(--text-secondary)]">No sub-organizer accounts yet.</p>}
      <p className="mt-4 border-t border-[var(--divider)] pt-3 text-xs text-[var(--text-secondary)]">Account records and assignments are stored in this browser. This prototype does not provide production-secure authentication or authorization.</p>
    </Card>
  </section>;
}

function AccountRow({ account, assignments, events, onEdit, onAdd, onActiveChange }: { account: DemoAccountRecord; assignments: TeamAssignment[]; events: { id: string; name: string }[]; onEdit: (assignment: TeamAssignment) => void; onAdd: () => void; onActiveChange: (active: boolean) => void }) {
  return <article className="py-4 first:pt-0 last:pb-0"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-medium text-[var(--text-primary)]">{account.name}</h4><span className={`rounded border px-2 py-0.5 text-xs ${account.active ? 'border-[var(--action-primary)]/40 bg-[var(--success-surface)] text-[var(--text-primary)]' : 'border-[var(--border)] bg-[var(--neutral-surface)] text-[var(--text-secondary)]'}`}>{account.active ? 'Active' : 'Inactive'}</span></div><p className="mt-1 text-sm text-[var(--text-secondary)]">{account.email}</p><div className="mt-3 space-y-2">{assignments.length ? assignments.map(assignment => <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2"><div className="min-w-0"><p className="text-sm font-medium text-[var(--text-primary)]">{events.find(event => event.id === assignment.eventId)?.name ?? 'Event removed'} · {assignment.functionName}</p><p className="text-xs text-[var(--text-secondary)]">Responsibilities: {assignment.responsibilities.join(', ') || 'None'}</p></div><Button type="button" variant="ghost" size="sm" onClick={() => onEdit(assignment)}>Edit</Button></div>) : <p className="text-xs text-[var(--text-secondary)]">No event functions assigned.</p>}</div></div><div className="flex shrink-0 gap-2"><Button type="button" variant="secondary" size="sm" onClick={onAdd}>Assign function</Button><Button type="button" variant="ghost" size="sm" onClick={() => onActiveChange(!account.active)} aria-label={`${account.active ? 'Deactivate' : 'Activate'} ${account.name}`}><UserRoundX className="h-4 w-4" aria-hidden="true" />{account.active ? 'Deactivate' : 'Activate'}</Button></div></div></article>;
}
