'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Link2,
  Copy,
  Check,
  RefreshCw,
  Ban,
  Plus,
  Users,
  ShieldCheck,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { useDashboardStore } from '@/lib/dashboard-state';
import { api } from '@/lib/api';
import { Invitation } from '@/lib/types';

export function InvitationManagementView() {
  const event = useDashboardStore(state => state.event);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create form state
  const [accessMode, setAccessMode] = useState<'both' | 'link' | 'code'>('both');
  const [customCode, setCustomCode] = useState('');
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [expiresAt, setExpiresAt] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [outreachSource, setOutreachSource] = useState('');
  const [campaignName, setCampaignName] = useState('');

  const eventId = event?.id;
  const loadInvitations = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.listInvitations(eventId);
      setInvitations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadInvitations(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadInvitations]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event?.id) return;
    setCreating(true);
    setError(null);
    try {
      await api.createInvitation(event.id, {
        accessMode,
        customCode: customCode ? customCode.trim() : undefined,
        maxUses: maxUses !== '' ? Number(maxUses) : null,
        expiresAt: expiresAt || null,
        requireApproval,
        outreachSource: outreachSource || undefined,
        campaignName: campaignName || undefined,
      });
      setShowCreateModal(false);
      // Reset form
      setCustomCode('');
      setMaxUses('');
      setExpiresAt('');
      setRequireApproval(false);
      setOutreachSource('');
      setCampaignName('');
      setAccessMode('both');
      await loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invitation');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    if (!event?.id || !confirm('Are you sure you want to revoke this invitation? Participants will no longer be able to join with it.')) return;
    try {
      await api.revokeInvitation(event.id, invitationId);
      await loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation');
    }
  };

  const handleRegenerate = async (invitationId: string) => {
    if (!event?.id || !confirm('Regenerating will invalidate the previous link/code and issue new credentials. Proceed?')) return;
    try {
      await api.regenerateInvitation(event.id, invitationId);
      await loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate invitation');
    }
  };

  const totalInvitedRegistrations = invitations.reduce((acc, inv) => acc + (inv.registrationCount || inv.usedCount || 0), 0);
  const activeInvitationsCount = invitations.filter(inv => inv.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-6 w-6 text-[var(--action-primary)]" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Event Access & Invitations</h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Manage invite links, secret tokens, join codes, and participant admission for <span className="font-semibold text-[var(--text-primary)]">{event.name}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadInvitations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Create Invitation
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-surface)] text-sm text-[var(--danger)] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md" variant="default">
          <p className="text-xs text-[var(--text-secondary)] font-medium">Active Invitations</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{activeInvitationsCount}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">{invitations.length} total generated</p>
        </Card>
        <Card padding="md" variant="default">
          <p className="text-xs text-[var(--text-secondary)] font-medium">Joined via Invites</p>
          <p className="mt-1 text-2xl font-bold text-[var(--action-primary)]">{totalInvitedRegistrations}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Attributed participant sign-ups</p>
        </Card>
        <Card padding="md" variant="default">
          <p className="text-xs text-[var(--text-secondary)] font-medium">Event Capacity</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
            {event.participantCapacity ? `${event.currentRegistrations} / ${event.participantCapacity}` : `${event.currentRegistrations} registered`}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">{event.targetRegistrations} target registrations</p>
        </Card>
        <Card padding="md" variant="default">
          <p className="text-xs text-[var(--text-secondary)] font-medium">Access Status</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={event.joiningEnabled !== false ? 'success' : 'neutral'}>
              {event.joiningEnabled !== false ? 'Joining Enabled' : 'Disabled'}
            </Badge>
            {event.requireApproval && (
              <Badge variant="warning">Approval Required</Badge>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">Configured in event setup</p>
        </Card>
      </div>

      {/* Invitations Table / List */}
      <Card variant="glass" padding="none">
        <CardHeader className="p-5 pb-3 border-b border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Generated Invitations</CardTitle>
              <CardDescription>Shareable URLs and alphanumeric codes for participants.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && invitations.length === 0 ? (
            <div className="p-12 text-center text-sm text-[var(--text-secondary)] flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading invitations...
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-12 text-center">
              <Link2 className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-base font-medium text-[var(--text-primary)]">No invitations generated yet</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
                Create an invitation link or code to distribute to prospective attendees, students, or VIP partners.
              </p>
              <Button size="sm" className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4" />
                Generate First Invitation
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)] overflow-x-auto">
              {invitations.map((inv) => {
                const computedStatus = inv.status;
                const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/participant/join?invite=${inv.token}` : `/participant/join?invite=${inv.token}`;

                return (
                  <div key={inv.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[var(--surface-elevated)]/40 transition-colors">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-base font-bold text-[var(--action-primary)] bg-[var(--action-primary-fill)]/20 px-2.5 py-0.5 rounded border border-[var(--action-primary)]/30">
                          {inv.code}
                        </span>
                        <Badge variant={computedStatus === 'active' ? 'success' : 'neutral'} size="sm">
                          {computedStatus.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" size="sm" className="capitalize">
                          {inv.accessMode || 'both'}
                        </Badge>
                        {inv.requireApproval && (
                          <Badge variant="warning" size="sm">
                            Approval Required
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          Uses: <strong className="text-[var(--text-primary)]">{inv.usedCount}</strong> {inv.maxUses ? `/ ${inv.maxUses}` : '(unlimited)'}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          Attributed Regs: <strong className="text-[var(--text-primary)]">{inv.registrationCount ?? inv.usedCount}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          Expires: {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : 'Never'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] truncate max-w-xl">
                        <span className="font-medium text-[var(--text-secondary)]">Link:</span>
                        <span className="truncate">{joinUrl}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopy(joinUrl, `link-${inv.id}`)}
                      >
                        {copiedId === `link-${inv.id}` ? <Check className="h-3.5 w-3.5 text-[var(--action-primary)]" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedId === `link-${inv.id}` ? 'Copied Link' : 'Copy Link'}
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopy(inv.code, `code-${inv.id}`)}
                      >
                        {copiedId === `code-${inv.id}` ? <Check className="h-3.5 w-3.5 text-[var(--action-primary)]" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedId === `code-${inv.id}` ? 'Copied Code' : 'Copy Code'}
                      </Button>

                      {computedStatus === 'active' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRegenerate(inv.id)}
                            title="Regenerate link/code"
                          >
                            <RefreshCw className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(inv.id)}
                            title="Revoke invitation"
                            className="text-[var(--danger)] hover:bg-[var(--danger-surface)]"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal / Dialog for New Invitation */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Generate New Invitation</h3>
                <p className="text-xs text-[var(--text-secondary)]">Create custom credentials for prospective attendees</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>✕</Button>
            </div>

            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <Select
                label="Invitation Access Mode"
                value={accessMode}
                onChange={e => setAccessMode(e.target.value as 'both' | 'link' | 'code')}
                options={[
                  { value: 'both', label: 'Both Direct Link and Secret Code' },
                  { value: 'link', label: 'Direct Invitation Link Only' },
                  { value: 'code', label: 'Invitation Code Only' },
                ]}
              />

              <Input
                label="Custom Code (Optional)"
                placeholder="Leave blank for auto-generated code"
                value={customCode}
                onChange={e => setCustomCode(e.target.value.toUpperCase())}
                helperText="Must be alphanumeric (e.g. VIP2026, SUMMER-HACK)."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Outreach source (optional)" value={outreachSource} onChange={e=>setOutreachSource(e.target.value)} options={[{value:'',label:'Not specified'},{value:'email',label:'Email'},{value:'campus ambassador',label:'Campus ambassador'},{value:'social media',label:'Social media'},{value:'partner',label:'Partner'},{value:'other',label:'Other'}]} />
                <Input label="Campaign name (optional)" maxLength={120} value={campaignName} onChange={e=>setCampaignName(e.target.value)} placeholder="e.g. Fall campus launch" helperText="Labels attribution only; it does not track delivery or opens." />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Usage Limit (Optional)"
                  type="number"
                  min={1}
                  placeholder="Unlimited if blank"
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value ? Number(e.target.value) : '')}
                  helperText="Maximum allowed registrations."
                />
                <Input
                  label="Expiry Date/Time (Optional)"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  helperText="Expires automatically after this."
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={requireApproval}
                    onChange={e => setRequireApproval(e.target.checked)}
                    className="rounded border-[var(--border)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
                  />
                  Require Organizer Approval for registrations using this invite
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} loading={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Generate Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
