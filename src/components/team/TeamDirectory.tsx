'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Mail,
  Briefcase,
  MapPin,
  Activity,
  Phone,
  Copy,
  Pencil,
  Save,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useDashboardStore } from '@/lib/dashboard-state';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CapabilitiesSection } from './CapabilitiesSection';
import type { TeamMemberProfile } from '@/lib/team-capabilities';

// ─── Types ────────────────────────────────────────────────────────────────────

type TeamMember = TeamMemberProfile;

// ─── Availability Badge ───────────────────────────────────────────────────────

function AvailabilityDot({ availability }: { availability: string }) {
  const colors = {
    available: 'bg-green-500',
    busy: 'bg-yellow-500',
    offline: 'bg-[var(--text-muted)]',
  };
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${colors[availability as keyof typeof colors] ?? 'bg-[var(--text-muted)]'}`}
      title={availability}
    />
  );
}

// ─── Member Card ──────────────────────────────────────────────────────────────

function MemberCard({ member, onSelect }: { member: TeamMember; onSelect: (m: TeamMember) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(member)}
      className="w-full text-left rounded-xl border border-[var(--divider)] bg-[var(--surface-elevated)] p-4 hover:border-[var(--action-primary)] hover:bg-[var(--action-primary-fill)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--action-primary)]/15 text-sm font-bold text-[var(--action-primary)] uppercase select-none">
            {member.name.charAt(0)}
            <AvailabilityDot availability={member.availability} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{member.name}</p>
            <p className="text-xs text-[var(--text-secondary)] truncate">{member.responsibility}</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] mt-1" aria-hidden="true" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1">
          <Mail className="h-3 w-3" />{member.email}
        </span>
        {member.active_incidents > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-orange-400 font-medium">
            <Activity className="h-3 w-3" />
            {member.active_incidents} active
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {member.skills.split(',').filter(Boolean).slice(0, 3).map(s => (
          <span key={s.trim()} className="rounded-full bg-[var(--surface-base)] border border-[var(--divider)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)] capitalize">
            {s.trim()}
          </span>
        ))}
        {member.zones !== 'all' && member.zones.split(',').filter(Boolean).slice(0, 2).map(z => (
          <span key={z.trim()} className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400 flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" />{z.trim()}
          </span>
        ))}
      </div>
    </button>
  );
}

// ─── Profile Slide-Over ───────────────────────────────────────────────────────

function MemberProfile({ member, eventId, onClose, onMemberUpdated }: { member: TeamMember; eventId: string; onClose: () => void; onMemberUpdated: (member: TeamMember) => void }) {
  const setSelectedView = useDashboardStore(s => s.setSelectedView);
  const [copied, setCopied] = useState('');
  const [contactEditing, setContactEditing] = useState(false);
  const [contactPhone, setContactPhone] = useState(member.phone ?? '');
  const [contactMethod, setContactMethod] = useState<TeamMember['preferred_contact_method']>(member.preferred_contact_method);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSaved, setContactSaved] = useState(false);
  const phone = member.phone?.trim() || '';
  const validPhone = phone.length <= 32 && /^[+()\d.\-\s]+$/.test(phone) && phone.replace(/\D/g, '').length >= 7;

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} copied`);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setCopied(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  async function saveContact() {
    setContactSaving(true);
    setContactError('');
    setContactSaved(false);
    try {
      const contact = await api.updateTeamContact(eventId, member.id, { phone: contactPhone.trim() || null, preferredContactMethod: contactMethod });
      onMemberUpdated({ ...member, ...contact });
      setContactEditing(false);
      setContactSaved(true);
    } catch (saveError) {
      setContactError(saveError instanceof Error ? saveError.message : 'Could not save contact details.');
    } finally {
      setContactSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex" aria-modal="true" role="dialog" aria-label="Team member profile">
      {/* Backdrop */}
      <button type="button" className="fixed inset-0 bg-[var(--metallic-black)]/60" onClick={onClose} aria-label="Close profile" />

      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-[var(--sidebar-bg)] border-l border-[var(--divider)] shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[var(--divider)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Team Member</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 p-5 sm:p-6">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--action-primary)]/15 text-2xl font-bold text-[var(--action-primary)] uppercase select-none">
              {member.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{member.name}</h3>
              <p className="text-sm text-[var(--text-secondary)] capitalize">{member.role.replace('_', ' ')}</p>
              <div className="mt-1 flex items-center gap-2">
                <AvailabilityDot availability={member.availability} />
                <span className="text-xs capitalize text-[var(--text-muted)]">{member.availability}</span>
              </div>
            </div>
          </div>

          <section aria-labelledby="contact-heading" className="space-y-3 rounded-xl border border-[var(--divider)] p-4">
            <div className="flex items-center justify-between gap-2"><h3 id="contact-heading" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Contact information</h3>{!contactEditing && <Button type="button" variant="ghost" size="sm" onClick={() => { setContactPhone(member.phone ?? ''); setContactMethod(member.preferred_contact_method); setContactError(''); setContactSaved(false); setContactEditing(true); }}><Pencil className="h-3.5 w-3.5" />Edit</Button>}</div>
            <div className="flex items-start gap-3 text-sm">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <div className="min-w-0 flex-1"><p className="text-xs text-[var(--text-muted)]">Official email</p><a className="break-all text-[var(--text-primary)] underline-offset-2 hover:underline" href={`mailto:${member.email}`}>{member.email}</a></div>
              <button type="button" onClick={() => void copyValue('Email', member.email)} aria-label="Copy email address" className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"><Copy className="h-4 w-4" /></button>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <div className="min-w-0 flex-1"><p className="text-xs text-[var(--text-muted)]">Phone</p>{validPhone ? <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="text-[var(--text-primary)] underline-offset-2 hover:underline">{phone}</a> : <p className="text-[var(--text-muted)]">Not provided</p>}</div>
              {validPhone && <button type="button" onClick={() => void copyValue('Phone number', phone)} aria-label="Copy phone number" className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"><Copy className="h-4 w-4" /></button>}
            </div>
            {contactEditing && <div className="space-y-2 rounded-lg bg-[var(--surface-elevated)] p-3">
              <label className="block text-xs text-[var(--text-secondary)]">Phone number<input type="tel" inputMode="tel" autoComplete="tel" value={contactPhone} onChange={event => setContactPhone(event.target.value)} maxLength={32} className="mt-1 w-full rounded-md border border-[var(--divider)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)]" /></label>
              <label className="block text-xs text-[var(--text-secondary)]">Preferred contact<select value={contactMethod ?? ''} onChange={event => setContactMethod((event.target.value || null) as TeamMember['preferred_contact_method'])} className="mt-1 w-full rounded-md border border-[var(--divider)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)]"><option value="">Not specified</option><option value="email">Email</option><option value="phone">Phone call</option><option value="sms">SMS</option></select></label>
              {contactError && <p role="alert" className="text-xs text-[var(--danger)]">{contactError}</p>}
              <div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => setContactEditing(false)} disabled={contactSaving}>Cancel</Button><Button type="button" size="sm" onClick={() => void saveContact()} loading={contactSaving}><Save className="h-3.5 w-3.5" />Save</Button></div>
            </div>}
            {!contactEditing && <p className="text-xs text-[var(--text-secondary)]"><span className="text-[var(--text-muted)]">Preferred contact:</span> {member.preferred_contact_method ? member.preferred_contact_method.toUpperCase() : 'Not specified'}</p>}
            <div className="flex items-start gap-3 text-sm"><Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" /><div><p className="text-xs text-[var(--text-muted)]">Department / responsibility</p><p className="text-[var(--text-primary)]">{member.responsibility || 'Not specified'}</p></div></div>
            {copied && <p role="status" className="text-xs text-green-400">{copied}</p>}
            {contactSaved && <p role="status" className="text-xs text-green-400">Contact details saved.</p>}
          </section>

          <CapabilitiesSection eventId={eventId} userId={member.id} capabilities={member.capabilities} canEdit onSaved={capabilities => onMemberUpdated({ ...member, capabilities })} />

          {/* Zones */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Assigned Zones</p>
            <div className="flex flex-wrap gap-1.5">
              {!member.zones.trim() ? <span className="text-xs text-[var(--text-muted)]">No zones provided</span> : member.zones === 'all' ? (
                <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-xs text-blue-400">All Zones</span>
              ) : member.zones.split(',').filter(Boolean).map(z => (
                <span key={z.trim()} className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-xs text-blue-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{z.trim()}
                </span>
              ))}
            </div>
          </div>

          <section aria-labelledby="performance-heading" className="space-y-3">
            <div><h3 id="performance-heading" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Performance &amp; Reliability</h3><p className="mt-1 text-[11px] text-[var(--text-muted)]">Raw counts for this event only; these are not a performance rating.</p></div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Incidents assigned', member.performance.incidentsAssigned],
                ['Resolved by responder', member.performance.incidentsResolved],
                ['Open incidents', member.performance.openIncidents],
                ['Tasks completed', member.performance.tasksCompleted],
                ['Active tasks', member.performance.tasksActive],
                ['Tasks overdue', member.performance.tasksOverdue],
              ].map(([label, value]) => <div key={label} className="rounded-lg border border-[var(--divider)] bg-[var(--surface-elevated)] p-3"><p className="text-[10px] text-[var(--text-muted)]">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums text-[var(--text-primary)]">{value}</p></div>)}
            </div>
            <div className="rounded-lg border border-[var(--divider)] p-3 text-xs"><p className="text-[var(--text-muted)]">Median time to resolve</p><p className="mt-1 font-medium text-[var(--text-primary)]">{member.performance.medianResolutionMinutes == null ? 'Not enough data yet' : `${member.performance.medianResolutionMinutes} minutes`}</p><p className="mt-1 text-[10px] text-[var(--text-muted)]">{member.performance.resolutionSampleSize} valid resolution record(s); only reported after at least 3.</p></div>
          </section>

          <section aria-labelledby="active-incidents-heading" className="space-y-2">
            <div className="flex items-center justify-between"><h3 id="active-incidents-heading" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Active Incidents</h3><span className="text-xs text-[var(--text-muted)]">{member.performance.activeIncidents.length}</span></div>
            {member.performance.activeIncidents.length ? <ul className="space-y-2">{member.performance.activeIncidents.map(incident => <li key={incident.id} className="rounded-lg border border-[var(--divider)] bg-[var(--surface-elevated)] p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-semibold text-[var(--text-primary)]">{incident.referenceNumber} · {incident.title}</p><p className="mt-1 text-[11px] capitalize text-[var(--text-secondary)]">{incident.urgency} · {incident.status.replaceAll('_', ' ')}{incident.zone ? ` · ${incident.zone}` : ''}</p></div><span className="shrink-0 rounded-full border border-[var(--divider)] px-2 py-0.5 text-[10px] capitalize text-[var(--text-secondary)]">{incident.category}</span></div></li>)}</ul> : <p className="rounded-lg border border-dashed border-[var(--divider)] px-3 py-4 text-xs text-[var(--text-muted)]">No active incidents assigned.</p>}
            <Button variant="secondary" size="sm" className="w-full" onClick={() => { setSelectedView('incidents'); onClose(); }}>View incident assignments →</Button>
          </section>

          <section aria-labelledby="recent-activity-heading" className="space-y-2">
            <h3 id="recent-activity-heading" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Recent Activity</h3>
            {member.performance.recentActivity.length ? <ul className="space-y-2">{member.performance.recentActivity.map((activity, index) => <li key={`${activity.incidentReference}-${activity.createdAt}-${index}`} className="rounded-md border border-[var(--divider)] px-3 py-2"><p className="text-xs font-medium capitalize text-[var(--text-primary)]">{activity.action.replaceAll('_', ' ')} · {activity.incidentReference}</p><p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--text-secondary)]">{activity.details}</p><time className="mt-1 block text-[10px] text-[var(--text-muted)]" dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleString()}</time></li>)}</ul> : <p className="rounded-lg border border-dashed border-[var(--divider)] px-3 py-4 text-xs text-[var(--text-muted)]">No recent incident activity recorded.</p>}
          </section>

        </div>
      </div>
    </div>
  );
}

// ─── Add Sub-Organizer Wizard ─────────────────────────────────────────────────

interface WizardProps {
  eventId: string;
  onClose: () => void;
  onCreated: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

function AddSubOrganizerWizard({ eventId, onClose, onCreated }: WizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    responsibility: '', skills: '', zones: '', phone: '', preferredContactMethod: '' as '' | 'email' | 'phone' | 'sms',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  }

  function validateStep1(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'A valid email is required.';
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    const errs: Record<string, string> = {};
    if (!form.responsibility.trim()) errs.responsibility = 'Responsibility is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.createSubOrganizer({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        responsibility: form.responsibility.trim(),
        eventId,
        skills: form.skills.trim() || 'operations',
        zones: form.zones.trim() || 'all',
        phone: form.phone.trim(),
        preferredContactMethod: form.preferredContactMethod,
      });
      setStep(4);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to create sub-organizer.');
    } finally {
      setSubmitting(false);
    }
  }

  const fieldCls = (name: string) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm bg-[var(--surface-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] transition-colors ${errors[name] ? 'border-red-500' : 'border-[var(--divider)]'}`;

  const stepLabels = ['Account', 'Role & Skills', 'Review', 'Done'];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10 px-4" aria-modal="true" role="dialog" aria-label="Add sub-organizer">
      {/* Backdrop */}
      <button type="button" className="fixed inset-0 bg-[var(--metallic-black)]/60" onClick={onClose} aria-label="Close wizard" />

      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--divider)] bg-[var(--sidebar-bg)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--divider)] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Add Sub-Organizer</h2>
            <p className="text-xs text-[var(--text-muted)]">Step {step} of {stepLabels.length}: {stepLabels[step - 1]}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex h-1 bg-[var(--divider)]">
          <div
            className="h-full bg-[var(--action-primary)] transition-all duration-300"
            style={{ width: `${(step / stepLabels.length) * 100}%` }}
          />
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1 — Account Details */}
          {step === 1 && (
            <>
              <p className="text-sm text-[var(--text-secondary)]">Create login credentials for the new team member.</p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Full Name *</label>
                  <input className={fieldCls('name')} value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Priya Sharma" autoFocus />
                  {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Email Address *</label>
                  <input className={fieldCls('email')} type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="e.g. priya@college.edu" />
                  {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Phone <span className="text-[var(--text-muted)]">(optional)</span></label>
                  <input className={fieldCls('phone')} type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="e.g. +1 555 010 1234" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Preferred contact method</label>
                  <select className={fieldCls('preferredContactMethod')} value={form.preferredContactMethod} onChange={e => update('preferredContactMethod', e.target.value as typeof form.preferredContactMethod)}>
                    <option value="">Not specified</option><option value="email">Email</option><option value="phone">Phone call</option><option value="sms">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Password *</label>
                  <input className={fieldCls('password')} type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min. 8 characters" />
                  {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Confirm Password *</label>
                  <input className={fieldCls('confirmPassword')} type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} placeholder="Repeat password" />
                  {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => { if (validateStep1()) setStep(2); }}>Next →</Button>
              </div>
            </>
          )}

          {/* Step 2 — Role & Skills */}
          {step === 2 && (
            <>
              <p className="text-sm text-[var(--text-secondary)]">Define their role, expertise, and assigned operational zones.</p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Event Responsibility *</label>
                  <input className={fieldCls('responsibility')} value={form.responsibility} onChange={e => update('responsibility', e.target.value)} placeholder="e.g. Transport Coordinator" autoFocus />
                  {errors.responsibility && <p className="mt-1 text-xs text-red-400">{errors.responsibility}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Skills <span className="text-[var(--text-muted)]">(comma-separated)</span></label>
                  <input className={fieldCls('skills')} value={form.skills} onChange={e => update('skills', e.target.value)} placeholder="e.g. transport, logistics, first-aid" />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Used for incident responder recommendations.</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Assigned Zones <span className="text-[var(--text-muted)]">(or leave blank for all)</span></label>
                  <input className={fieldCls('zones')} value={form.zones} onChange={e => update('zones', e.target.value)} placeholder="e.g. Gate A, Main Hall, Parking" />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Incidents in these zones will be prioritised for this responder.</p>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
                <Button onClick={() => { if (validateStep2()) setStep(3); }}>Next →</Button>
              </div>
            </>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <>
              <p className="text-sm text-[var(--text-secondary)]">Review the details before creating the account.</p>
              <div className="rounded-xl border border-[var(--divider)] divide-y divide-[var(--divider)] text-sm">
                {[
                  { label: 'Name', value: form.name },
                  { label: 'Email', value: form.email },
                  { label: 'Password', value: '••••••••' },
                  { label: 'Responsibility', value: form.responsibility },
                  { label: 'Phone', value: form.phone || 'Not provided' },
                  { label: 'Preferred contact', value: form.preferredContactMethod || 'Not specified' },
                  { label: 'Skills', value: form.skills || 'operations' },
                  { label: 'Zones', value: form.zones || 'All zones' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-3 px-4 py-3">
                    <span className="w-32 shrink-0 text-xs text-[var(--text-muted)]">{label}</span>
                    <span className="text-[var(--text-primary)]">{value}</span>
                  </div>
                ))}
              </div>
              {submitError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                  {submitError}
                </div>
              )}
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(2)}>← Back</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <><RefreshCw className="h-4 w-4 animate-spin" /> Creating…</> : 'Create Account'}
                </Button>
              </div>
            </>
          )}

          {/* Step 4 — Done */}
          {step === 4 && (
            <div className="py-4 text-center space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-400" />
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Account Created!</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  <strong>{form.name}</strong> has been added as a sub-organizer and assigned to this event.
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">They can log in with their email and password immediately.</p>
              </div>
              <Button onClick={() => { onCreated(); onClose(); }}>
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main TeamDirectory Component ─────────────────────────────────────────────

export function TeamDirectory() {
  const { event } = useDashboardStore();
  const eventId = event?.id;
  const isUsingApi = useDashboardStore(s => s.isUsingApi);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [availFilter, setAvailFilter] = useState<'all' | 'available' | 'busy' | 'offline' | 'unknown'>('all');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.listTeamMembers(eventId);
      setMembers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => { if (!cancelled) await load(); });
    return () => { cancelled = true; };
  }, [load]);

  const filtered = members.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()) || m.responsibility.toLowerCase().includes(search.toLowerCase());
    const matchAvail = availFilter === 'all' || m.availability === availFilter;
    return matchSearch && matchAvail;
  });

  const summary = {
    total: members.length,
    available: members.filter(m => m.availability === 'available').length,
    busy: members.filter(m => m.availability === 'busy').length,
    totalActiveIncidents: members.reduce((acc, m) => acc + (m.active_incidents ?? 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[var(--action-primary)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Team & Responders</h2>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-[var(--text-muted)]" />}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load} aria-label="Refresh team">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {isUsingApi && (
            <Button size="sm" onClick={() => setShowWizard(true)}>
              <Plus className="h-4 w-4" />
              Add Sub-Organizer
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Members', value: summary.total, color: 'default' },
          { label: 'Available', value: summary.available, color: 'green' },
          { label: 'Busy', value: summary.busy, color: 'orange' },
          { label: 'Active Incidents', value: summary.totalActiveIncidents, color: summary.totalActiveIncidents > 0 ? 'orange' : 'default' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border p-3 ${color === 'green' ? 'border-green-500/30 bg-green-500/5' : color === 'orange' ? 'border-orange-500/30 bg-orange-500/5' : 'border-[var(--divider)] bg-[var(--surface-elevated)]'}`}>
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
            <p className={`text-2xl font-bold tabular-nums mt-0.5 ${color === 'green' ? 'text-green-400' : color === 'orange' ? 'text-orange-400' : 'text-[var(--text-primary)]'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or role…"
            className="w-full rounded-lg border border-[var(--divider)] bg-[var(--surface-elevated)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
          />
        </div>
        <select
          value={availFilter}
          onChange={e => setAvailFilter(e.target.value as typeof availFilter)}
          className="rounded-lg border border-[var(--divider)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
          aria-label="Filter by availability"
        >
          <option value="all">All availability</option>
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="offline">Offline</option>
          <option value="unknown">Not set</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Team Grid */}
      {!loading && filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
              {members.length === 0 ? 'No team members assigned to this event yet.' : 'No members match your search.'}
            </p>
            {members.length === 0 && isUsingApi && (
              <Button className="mt-4" onClick={() => setShowWizard(true)}>
                <Plus className="h-4 w-4" />
                Add First Sub-Organizer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(m => (
            <MemberCard key={m.id} member={m} onSelect={setSelectedMember} />
          ))}
        </div>
      )}

      {/* Profile Slide-Over */}
      {selectedMember && (
        <MemberProfile
          member={selectedMember}
          eventId={event?.id ?? ''}
          onClose={() => setSelectedMember(null)}
          onMemberUpdated={updated => { setSelectedMember(updated); setMembers(current => current.map(member => member.id === updated.id ? updated : member)); }}
        />
      )}

      {/* Add Sub-Organizer Wizard */}
      {showWizard && event?.id && (
        <AddSubOrganizerWizard
          eventId={event.id}
          onClose={() => setShowWizard(false)}
          onCreated={() => { void load(); }}
        />
      )}
    </div>
  );
}
