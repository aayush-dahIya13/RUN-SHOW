'use client';

import { useEffect, useState } from 'react';
import { Mail, AlertCircle, CheckCircle, Loader2, ArrowRight, Lock, TicketCheck, CalendarDays, MapPin, Tag } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDemoSession } from '@/lib/demo-auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

interface Invitation {
  id: string;
  code: string;
  eventId: string;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  status: string;
}

interface Event {
  id: string;
  name: string;
  type: string;
  date: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  format: 'in-person' | 'virtual' | 'hybrid';
  venue: string | null;
  meetingUrl: string | null;
  joiningInstructions: string | null;
  audience: string;
  participantCapacity: number | null;
  currentRegistrations: number;
  targetRegistrations: number;
  eligibilityRequirements: string | null;
}

type InvitationStatus = 'valid' | 'expired' | 'revoked' | 'exhausted' | 'invalid';

export function JoinInvitationView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useDemoSession();
  const codeFromUrl = searchParams.get('code') || searchParams.get('invite');
  const [code, setCode] = useState(codeFromUrl || '');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [status, setStatus] = useState<InvitationStatus>('valid');
  const [message, setMessage] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requireApproval, setRequireApproval] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  useEffect(() => {
    if (codeFromUrl) {
      setCode(codeFromUrl);
      validateInvitation(codeFromUrl);
    }
  }, [codeFromUrl]);

  const validateInvitation = async (invitationCode: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setInvitation(null);
    setEvent(null);
    setAlreadyRegistered(false);
    setExistingStatus(null);

    try {
      const res = await fetch(`/api/join/${encodeURIComponent(invitationCode)}`, { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid invitation code or link');

      setInvitation(data.invitation);
      setEvent(data.event);
      setStatus(data.status);
      setMessage(data.message);
      setAlreadyRegistered(data.alreadyRegistered);
      setExistingStatus(data.existingStatus || null);
      setRequireApproval(Boolean(data.event?.requireApproval || data.invitation?.requireApproval));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate invitation');
      setStatus('invalid');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = () => {
    if (!code.trim()) {
      setError('Please enter an invitation code or link token');
      return;
    }
    const target = code.trim().length >= 24 ? `invite=${encodeURIComponent(code.trim())}` : `code=${encodeURIComponent(code.trim())}`;
    router.push(`/participant/join?${target}`);
  };

  const handleJoin = async () => {
    if (!session) {
      const currentPath = `/participant/join?${code.trim().length >= 24 ? 'invite' : 'code'}=${encodeURIComponent(code.trim())}`;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    if (!code.trim() || status !== 'valid') return;

    setJoining(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/join/${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to join event');

      setSuccess(data.message);
      setTicketNumber(data.ticket?.ticketNumber || null);
      setTimeout(() => {
        router.push('/participant/dashboard?tab=events');
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join event');
    } finally {
      setJoining(false);
    }
  };

  const canJoin = status === 'valid' && !alreadyRegistered && !loading;

  const statusConfig: Record<InvitationStatus, { icon: React.ReactNode; label: string; color: string; bgColor: string }> = {
    valid: { icon: <CheckCircle className="h-5 w-5" />, label: 'Valid Invitation', color: 'text-[var(--action-primary)]', bgColor: 'bg-[var(--success-surface)]' },
    expired: { icon: <AlertCircle className="h-5 w-5" />, label: 'Expired', color: 'text-[var(--danger)]', bgColor: 'bg-[var(--danger-surface)]' },
    revoked: { icon: <AlertCircle className="h-5 w-5" />, label: 'Revoked', color: 'text-[var(--danger)]', bgColor: 'bg-[var(--danger-surface)]' },
    exhausted: { icon: <AlertCircle className="h-5 w-5" />, label: 'Usage Limit Reached', color: 'text-[var(--danger)]', bgColor: 'bg-[var(--danger-surface)]' },
    invalid: { icon: <AlertCircle className="h-5 w-5" />, label: 'Invalid Code', color: 'text-[var(--danger)]', bgColor: 'bg-[var(--danger-surface)]' },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Join with Invitation</h1>
        <p className="text-sm text-[var(--text-secondary)]">Enter an invitation code or link to join a private event</p>
      </div>

      <Card padding="lg">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Enter Invitation Code</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
            <input
              type="text"
              placeholder="Enter invitation code (e.g., ABC123XYZ)"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleValidate()}
              className="w-full pl-10 pr-4 py-3 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              disabled={loading}
            />
          </div>
          <Button onClick={handleValidate} disabled={loading || !code.trim()} className="whitespace-nowrap">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validate'}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
        <p className="mt-3 text-xs text-[var(--text-muted)]">You can also use an invitation link directly: <code className="bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded text-[var(--text-primary)]">/join/[CODE]</code></p>
      </Card>

      {invitation && event && (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-lg ${currentStatus.bgColor} border border-[var(--border)]`}>
            <span className={currentStatus.color}>{currentStatus.icon}</span>
            <div>
              <p className="font-medium text-[var(--text-primary)]">{currentStatus.label}</p>
              <p className="text-sm text-[var(--text-secondary)]">{message}</p>
            </div>
          </div>

          <Card padding="lg">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">{event.name}</h2>
                  <Badge variant={event.format === 'virtual' ? 'info' : event.format === 'hybrid' ? 'warning' : 'success'} className="text-xs capitalize">{event.format}</Badge>
                  {event.type && <Badge variant="outline" className="text-xs">{event.type}</Badge>}
                  {requireApproval && <Badge variant="warning" className="text-xs">Approval Required</Badge>}
                </div>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{event.audience || 'No description available'}</p>
              </div>
              {canJoin && (
                <Button size="lg" onClick={handleJoin} disabled={joining} loading={joining} className="shrink-0">
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : requireApproval ? 'Request to Join' : 'Join Event'}
                </Button>
              )}
            </div>
            {success && (
              <div className="mb-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--success-surface)] text-sm text-[var(--action-primary)] flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}
            {ticketNumber && <div className="mb-4 rounded-lg border border-[var(--action-primary)]/50 bg-[var(--success-surface)] p-3 text-sm"><span className="text-[var(--text-secondary)]">Ticket number: </span><strong className="font-mono text-[var(--text-primary)]">{ticketNumber}</strong></div>}

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Date" value={formatDateRange(event.startDate, event.endDate)} />
              <DetailRow icon={<MapPin className="h-4 w-4" />} label="Venue" value={event.venue || (event.format === 'virtual' ? 'Online' : 'TBA')} />
              <DetailRow icon={<Tag className="h-4 w-4" />} label="Format" value={event.format === 'virtual' ? 'Online' : event.format === 'hybrid' ? 'Hybrid' : 'In-person'} />
              <DetailRow icon={<TicketCheck className="h-4 w-4" />} label="Capacity" value={`${event.currentRegistrations} / ${event.participantCapacity || event.targetRegistrations || 'Unlimited'}`} />
            </div>

            {event.eligibilityRequirements && (
              <div className="pt-4 border-t border-[var(--divider)]">
                <h3 className="font-medium text-[var(--text-primary)] mb-2">Eligibility Requirements</h3>
                <p className="text-sm text-[var(--text-secondary)]">{event.eligibilityRequirements}</p>
              </div>
            )}
          </Card>

          {alreadyRegistered && (
            <Card padding="lg" className="border-[var(--action-primary)]/40 bg-[var(--success-surface)]/50">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-[var(--action-primary)]" aria-hidden="true" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Already Registered</p>
                  <p className="text-sm text-[var(--text-secondary)]">You are already registered for this event.</p>
                </div>
              </div>
              <Button variant="secondary" className="mt-4 w-full" onClick={() => router.push('/participant/dashboard?tab=events')}>
                View My Events
              </Button>
            </Card>
          )}

          {status !== 'valid' && !alreadyRegistered && (
            <Card padding="lg" className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-[var(--danger-surface)] flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-[var(--danger)]" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Unable to Join</h2>
              <p className="text-[var(--text-secondary)] mb-4">{message}</p>
              <Button variant="secondary" onClick={() => router.push('/participant/explore')}>
                Browse Public Events
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-elevated)]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--action-primary-fill)] text-[var(--action-primary-foreground)]">{icon}</span>
      <div>
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
        <p className="font-medium text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}

function formatDateRange(start: string, end: string) {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  if (!isValid(startDate)) return 'Date TBD';
  if (!isValid(endDate) || format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
    return format(startDate, 'EEEE, MMMM d, yyyy');
  }
  return `${format(startDate, 'EEEE, MMM d')} – ${format(endDate, 'MMM d, yyyy')}`;
}
