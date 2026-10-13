'use client';

import { useState } from 'react';
import { Check, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { CAPABILITY_CATEGORIES, PROFICIENCY_LEVELS, type TeamCapability } from '@/lib/team-capabilities';

type EditableCapability = Omit<TeamCapability, 'eventId' | 'userId' | 'verifiedBy' | 'verifiedAt'>;

export function CapabilitiesSection({
  eventId, userId, capabilities, canEdit, onSaved,
}: {
  eventId: string;
  userId: string;
  capabilities: TeamCapability[];
  canEdit: boolean;
  onSaved: (capabilities: TeamCapability[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableCapability[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function update(index: number, patch: Partial<EditableCapability>) {
    setDraft(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    setMessage('');
    setError('');
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await api.updateTeamCapabilities(eventId, userId, draft.map(item => item.id?.startsWith('new-') ? { ...item, id: undefined } : item));
      onSaved(saved);
      setEditing(false);
      setMessage('Capabilities saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save capabilities.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="capabilities-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 id="capabilities-heading" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Capabilities &amp; Expertise</h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Self-reported skills are distinct from organizer verification.</p>
        </div>
        {canEdit && !editing && <Button type="button" variant="ghost" size="sm" onClick={() => { setDraft(capabilities.map(({ id, category, name, proficiency, experienceYears, description, verified }) => ({ id, category, name, proficiency, experienceYears, description, verified }))); setEditing(true); setError(''); }} aria-label="Edit capabilities"><Pencil className="h-3.5 w-3.5" />Edit</Button>}
      </div>

      {!editing ? <div className="space-y-2">
        {capabilities.length ? capabilities.map(capability => <article key={capability.id} className="rounded-lg border border-[var(--divider)] bg-[var(--surface-elevated)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">{capability.name}</p>
            <span className="rounded-full border border-[var(--divider)] px-2 py-0.5 text-[10px] capitalize text-[var(--text-secondary)]">{capability.proficiency}</span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{CAPABILITY_CATEGORIES.find(category => category.id === capability.category)?.label ?? capability.category}{capability.experienceYears != null ? ` · ${capability.experienceYears} years’ experience` : ''}</p>
          {capability.description && <p className="mt-1.5 text-xs text-[var(--text-muted)]">{capability.description}</p>}
          <p className={`mt-2 flex items-center gap-1 text-[10px] ${capability.verified ? 'text-green-400' : 'text-[var(--text-muted)]'}`}>
            {capability.verified && <Check className="h-3 w-3" aria-hidden="true" />}{capability.verified ? 'Verified by organizer' : 'Not organizer-verified'}
          </p>
        </article>) : <p className="rounded-lg border border-dashed border-[var(--divider)] px-3 py-4 text-xs text-[var(--text-muted)]">No capabilities have been entered.</p>}
      </div> : <div className="space-y-3">
        {draft.map((item, index) => <fieldset key={item.id ?? `new-${index}`} className="space-y-2 rounded-lg border border-[var(--divider)] p-3">
          <legend className="sr-only">Capability {index + 1}</legend>
          <div className="flex gap-2">
            <select aria-label={`Capability category ${index + 1}`} value={item.category} onChange={event => update(index, { category: event.target.value as TeamCapability['category'] })} className="min-w-0 flex-1 rounded-md border border-[var(--divider)] bg-[var(--surface-card)] px-2 py-2 text-xs text-[var(--text-primary)]">
              {CAPABILITY_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
            <button type="button" onClick={() => setDraft(current => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove capability ${index + 1}`} className="rounded-md p-2 text-[var(--danger)] hover:bg-[var(--danger-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"><Trash2 className="h-4 w-4" /></button>
          </div>
          <input aria-label={`Capability name ${index + 1}`} value={item.name} onChange={event => update(index, { name: event.target.value })} maxLength={80} placeholder="Skill or responsibility" className="w-full rounded-md border border-[var(--divider)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)]" />
          <div className="grid grid-cols-2 gap-2">
            <select aria-label={`Proficiency ${index + 1}`} value={item.proficiency} onChange={event => update(index, { proficiency: event.target.value as TeamCapability['proficiency'] })} className="rounded-md border border-[var(--divider)] bg-[var(--surface-card)] px-2 py-2 text-xs capitalize text-[var(--text-primary)]">
              {PROFICIENCY_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
            </select>
            <input aria-label={`Years of experience ${index + 1}`} type="number" min="0" max="80" step="0.5" value={item.experienceYears ?? ''} onChange={event => update(index, { experienceYears: event.target.value === '' ? null : Number(event.target.value) })} placeholder="Years (optional)" className="min-w-0 rounded-md border border-[var(--divider)] bg-[var(--surface-card)] px-2 py-2 text-xs text-[var(--text-primary)]" />
          </div>
          <textarea aria-label={`Capability description ${index + 1}`} value={item.description} onChange={event => update(index, { description: event.target.value })} maxLength={300} rows={2} placeholder="Short description (optional)" className="w-full resize-y rounded-md border border-[var(--divider)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--text-primary)]" />
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"><input type="checkbox" checked={item.verified} onChange={event => update(index, { verified: event.target.checked })} />Verified by me</label>
        </fieldset>)}
        <Button type="button" variant="secondary" size="sm" onClick={() => setDraft(current => [...current, { id: `new-${Date.now()}-${current.length}`, category: CAPABILITY_CATEGORIES[0].id, name: '', proficiency: 'beginner', experienceYears: null, description: '', verified: false }])}><Plus className="h-3.5 w-3.5" />Add capability</Button>
        {error && <p role="alert" className="text-xs text-[var(--danger)]">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); setError(''); }} disabled={saving}><X className="h-3.5 w-3.5" />Cancel</Button><Button type="button" size="sm" onClick={() => void save()} loading={saving}><Save className="h-3.5 w-3.5" />Save</Button></div>
      </div>}
      {message && <p role="status" className="text-xs text-green-400">{message}</p>}
    </section>
  );
}
