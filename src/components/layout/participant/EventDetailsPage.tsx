'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, TicketCheck, Tag, ChevronDown, ChevronUp, ArrowRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { useRouter, useParams } from 'next/navigation';
import { useDemoSession } from '@/lib/demo-auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

interface PublicEvent {
  id: string;
  name: string;
  description: string;
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
  objectives: string[];
  participantCapacity: number | null;
  currentRegistrations: number;
  targetRegistrations: number;
  venueConfirmed: boolean;
  daysRemaining: number;
  lifecycle: string;
  visibility: string;
  ticketType: string | null;
  ticketPrice: number | null;
  ticketCurrency: string | null;
  registrationDeadline: string | null;
  cancellationPolicy: string | null;
  eligibilityRequirements: string | null;
  bannerImageUrl: string | null;
  organizerInstitution: string | null;
  tags: string[];
  organizer: { name: string | null; email: string | null };
  isDemo?: boolean;
  ticketOptions: Array<{
    id: string;
    name: string;
    description: string;
    type: 'free' | 'paid';
    price: number;
    currency: string;
    capacity: number | null;
    soldCount: number;
    salesStart: string | null;
    salesEnd: string | null;
    isActive: boolean;
  }>;
}

interface Registration {
  id: string;
  eventId: string;
  participantId: string;
  ticketOptionId: string | null;
  invitationCode: string | null;
  status: string;
  paymentStatus: string;
  registeredAt: string;
  referenceNumber: string;
}

export function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const session = useDemoSession();
  const eventId = params.id as string;
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedTicketOption, setSelectedTicketOption] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    fetchEvent();
    fetchRegistration();
  }, [eventId]);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/public?id=${eventId}`, { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error('Event not found');
      const data = await res.json();
      setEvent(data.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistration = async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/events/${eventId}/registration`, { headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        setRegistration(data.registration);
      }
    } catch {
      // Ignore registration fetch errors
    }
  };

  const handleRegister = async () => {
    if (!session) {
      router.push('/login');
      return;
    }
    if (!event) return;

    setRegistering(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketOptionId: selectedTicketOption,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      setSuccess(data.message);
      setShowRegisterModal(false);
      fetchRegistration();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const isFree = event?.ticketOptions?.every(opt => opt.type === 'free' && opt.price === 0) ?? true;
  const hasCapacity = event ? (event.participantCapacity ? event.currentRegistrations < event.participantCapacity : true) : false;
  const isRegistered = registration?.status === 'confirmed';
  const registrationDeadlinePassed = event?.registrationDeadline && Date.parse(event.registrationDeadline) < Date.now();
  const canRegister = !isRegistered && hasCapacity && !registrationDeadlinePassed && event?.lifecycle !== 'cancelled' && event?.lifecycle !== 'completed';

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
        <Card padding="lg"><Skeleton className="h-60 w-full" /></Card>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-[var(--danger)]" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">Event Not Found</h2>
        <p className="mt-2 text-[var(--text-secondary)]">{error || 'The event you\'re looking for doesn\'t exist or is not publicly available.'}</p>
        <Button className="mt-4" variant="secondary" onClick={() => router.back()}>Back to Explore</Button>
      </div>
    );
  }

  const dateRange = event.startDate === event.endDate
    ? format(parseISO(event.startDate), 'EEEE, MMMM d, yyyy')
    : `${format(parseISO(event.startDate), 'EEEE, MMMM d, yyyy')} – ${format(parseISO(event.endDate), 'MMM d, yyyy')}`;

  return (
    <div className="space-y-6">
      {/* Event Header */}
      {event.bannerImageUrl && (
        <div className="relative h-64 lg:h-80 rounded-xl overflow-hidden">
          <img src={event.bannerImageUrl} alt={event.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--page-bg)]/90 via-[var(--page-bg)]/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-bold text-white">{event.name}</h1>
              <Badge variant={event.format === 'virtual' ? 'info' : event.format === 'hybrid' ? 'warning' : 'success'} className="text-sm capitalize">{event.format}</Badge>
              {event.type && <Badge variant="outline" className="text-sm">{event.type}</Badge>}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Description */}
          <Card padding="lg">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">About this event</h2>
            <div className="prose prose-invert max-w-none text-[var(--text-secondary)]">
              <p className="whitespace-pre-wrap">{event.description}</p>
            </div>
          </Card>

          {/* Event Details Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailCard icon={<CalendarDays className="h-5 w-5" />} label="Date & Time" value={dateRange} subValue={`${event.startTime} – ${event.endTime} (${event.timezone})`} />
            <DetailCard icon={<MapPin className="h-5 w-5" />} label={event.format === 'virtual' ? 'Online Platform' : 'Venue'} value={event.venue || (event.format === 'virtual' ? 'Online - link provided after registration' : 'Venue details pending')} subValue={event.format === 'virtual' ? 'Virtual event' : event.venueConfirmed ? 'Confirmed' : 'Pending confirmation'} />
            <DetailCard icon={<Tag className="h-5 w-5" />} label="Category" value={event.type || 'Not specified'} />
            <DetailCard icon={<TicketCheck className="h-5 w-5" />} label="Capacity" value={`${event.currentRegistrations} / ${event.participantCapacity || event.targetRegistrations || 'Unlimited'}`} subValue={`${event.daysRemaining} days remaining`} />
            <DetailCard icon={<MapPin className="h-5 w-5" />} label="Format" value={event.format === 'virtual' ? 'Online' : event.format === 'hybrid' ? 'Hybrid' : 'In-person'} />
            {event.organizerInstitution && (
              <DetailCard icon={<Tag className="h-5 w-5" />} label="Organizer" value={event.organizerInstitution} />
            )}
          </div>

          {/* Objectives */}
          {event.objectives && event.objectives.length > 0 && (
            <Card padding="lg">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Event Highlights</h2>
              <ul className="space-y-2">
                {event.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-3 text-[var(--text-secondary)]">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--action-primary)]" />
                    {obj}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Additional Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            {event.eligibilityRequirements && (
              <Card padding="md">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Eligibility Requirements</h3>
                <p className="text-sm text-[var(--text-secondary)]">{event.eligibilityRequirements}</p>
              </Card>
            )}
            {event.cancellationPolicy && (
              <Card padding="md">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Cancellation Policy</h3>
                <p className="text-sm text-[var(--text-secondary)]">{event.cancellationPolicy}</p>
              </Card>
            )}
          </div>

          {/* Agenda */}
          {event.ticketOptions && event.ticketOptions.length > 0 && (
            <Card padding="lg">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Ticket Options</h2>
              <div className="space-y-3">
                {event.ticketOptions.filter(opt => opt.isActive).map(opt => (
                  <TicketOptionCard
                    key={opt.id}
                    option={opt}
                    selected={selectedTicketOption === opt.id}
                    onSelect={() => setSelectedTicketOption(opt.id)}
                    disabled={!!(!canRegister || registrationDeadlinePassed)}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar - Registration */}
        <div className="lg:sticky lg:top-24">
          <Card padding="lg" className="border-[var(--action-primary)]/40 bg-[var(--success-surface)]/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Register</h2>
              {event.isDemo && <Badge variant="secondary" className="text-xs">Demo data</Badge>}
            </div>

            {isRegistered && registration && (
              <div className="space-y-3 p-4 rounded-lg bg-[var(--success-surface)] border border-[var(--action-primary)]">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-[var(--action-primary)]" aria-hidden="true" />
                  <span className="font-medium text-[var(--text-primary)]">You're registered!</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">Reference: <span className="font-mono">{registration.referenceNumber}</span></p>
                <p className="text-sm text-[var(--text-secondary)]">Status: <span className="font-medium capitalize">{registration.status}</span></p>
                <Button variant="secondary" className="w-full" onClick={() => router.push('/participant/dashboard?tab=events')}>
                  View My Events
                </Button>
              </div>
            )}

            {!isRegistered && canRegister && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">Registration</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {event.ticketOptions.some(opt => opt.type === 'paid' && opt.price > 0)
                          ? 'Select a ticket option below'
                          : 'Free registration'}
                      </p>
                    </div>
                    {event.ticketOptions.some(opt => opt.type === 'paid' && opt.price > 0) && (
                      <Badge variant="warning" className="text-xs">Paid</Badge>
                    )}
                  </div>
                </div>

                {event.ticketOptions.some(opt => opt.type === 'paid' && opt.price > 0) && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Select a ticket option to continue. Payment integration is demo-only.
                  </p>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setShowRegisterModal(true)}
                  disabled={!canRegister || registering}
                  loading={registering}
                >
                  {registering ? 'Processing...' : isFree ? 'Register Free' : 'Continue to Register'}
                </Button>

                {registrationDeadlinePassed && (
                  <p className="text-center text-xs text-[var(--danger)]">
                    Registration deadline has passed ({format(parseISO(event.registrationDeadline!), 'MMM d, yyyy')})
                  </p>
                )}
                {!hasCapacity && (
                  <p className="text-center text-xs text-[var(--danger)]">Event is at full capacity</p>
                )}
                {event.lifecycle === 'cancelled' && (
                  <p className="text-center text-xs text-[var(--danger)]">This event has been cancelled</p>
                )}
                {event.lifecycle === 'completed' && (
                  <p className="text-center text-xs text-[var(--danger)]">This event has already ended</p>
                )}
              </div>
            )}

            {!canRegister && !isRegistered && (
              <div className="text-center py-4">
                <AlertCircle className="mx-auto h-8 w-8 text-[var(--text-muted)]" aria-hidden="true" />
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Registration is not available</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {registrationDeadlinePassed ? 'Registration deadline has passed' :
                  !hasCapacity ? 'Event is at full capacity' :
                  event.lifecycle === 'cancelled' ? 'Event has been cancelled' :
                  event.lifecycle === 'completed' ? 'Event has already ended' :
                  'Registration is closed'}
                </p>
              </div>
            )}

            {!session && !isRegistered && (
              <div className="mt-4 pt-4 border-t border-[var(--divider)] text-center">
                <p className="text-sm text-[var(--text-secondary)]">Need an account to register?</p>
                <Button variant="secondary" className="mt-2 w-full" onClick={() => router.push('/login')}>
                  Sign In / Sign Up
                </Button>
              </div>
            )}

            {/* Event Info */}
            <div className="mt-6 pt-4 border-t border-[var(--divider)] space-y-3 text-sm">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Organizer</span>
                <span className="font-medium text-[var(--text-primary)]">{event.organizerInstitution || event.organizer.name || 'Not specified'}</span>
              </div>
              {event.registrationDeadline && (
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Registration Deadline</span>
                  <span className="font-medium text-[var(--text-primary)]">{format(parseISO(event.registrationDeadline), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--metallic-black)]/50" onClick={() => setShowRegisterModal(false)}>
          <div className="w-full max-w-md bg-[var(--surface-card)] rounded-xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Confirm Registration</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Register for <strong>{event.name}</strong>?
              {selectedTicketOption && (
                <>
                  <br />Ticket: {event.ticketOptions.find(opt => opt.id === selectedTicketOption)?.name}
                </>
              )}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowRegisterModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleRegister} disabled={registering} loading={registering}>
                {registering ? 'Processing...' : isFree ? 'Confirm Free Registration' : 'Continue to Payment'}
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
            {success && <p className="mt-3 text-sm text-[var(--action-primary)]">{success}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailCard({ icon, label, value, subValue }: { icon: React.ReactNode; label: string; value: string; subValue?: string }) {
  return (
    <Card padding="md">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--action-primary-fill)] text-[var(--action-primary-foreground)]">{icon}</span>
        <div>
          <p className="text-xs text-[var(--text-secondary)]">{label}</p>
          <p className="mt-1 font-medium text-[var(--text-primary)]">{value}</p>
          {subValue && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{subValue}</p>}
        </div>
      </div>
    </Card>
  );
}

function TicketOptionCard({ option, selected, onSelect, disabled }: { option: PublicEvent['ticketOptions'][0]; selected: boolean; onSelect: () => void; disabled: boolean }) {
  const isFree = option.type === 'free' || option.price === 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
        selected
          ? 'border-[var(--action-primary)] bg-[var(--success-surface)]'
          : 'border-[var(--border)] bg-[var(--surface-card)] hover:border-[var(--action-primary)]/50 hover:bg-[var(--surface-elevated)]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-[var(--text-primary)]">{option.name}</p>
          {option.description && <p className="text-sm text-[var(--text-secondary)]">{option.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Badge variant={isFree ? 'success' : 'warning'} className="text-xs">{isFree ? 'Free' : 'Paid'}</Badge>
            {!isFree && <span>{option.currency} {option.price.toLocaleString()}</span>}
            {option.capacity && <span>{option.soldCount}/{option.capacity} sold</span>}
          </div>
        </div>
        {selected && <CheckCircle className="h-6 w-6 text-[var(--action-primary)]" aria-hidden="true" />}
      </div>
    </button>
  );
}