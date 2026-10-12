'use client';

import { useEffect, useState } from 'react';
import { Search, FilterX, CalendarDays, TicketCheck, MapPin, Tag, ChevronDown, Loader2, ArrowRight } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { useDemoSession } from '@/lib/demo-auth';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
  ticketOptions: Array<{
    id: string;
    name: string;
    type: 'free' | 'paid';
    price: number;
    currency: string;
    capacity: number | null;
    soldCount: number;
  }>;
}

const EVENT_CATEGORIES = ['Conference', 'Workshop', 'Hackathon', 'Seminar', 'Meetup', 'Festival', 'Networking', 'Training', 'Other'];
const EVENT_FORMATS = ['in-person', 'virtual', 'hybrid'];
const SORT_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming first' },
  { value: 'recent', label: 'Recently published' },
  { value: 'price_asc', label: 'Price: Low to high' },
  { value: 'price_desc', label: 'Price: High to low' },
];

export function ExploreEventsView() {
  const router = useRouter();
  const session = useDemoSession();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sort: sortBy,
      });
      if (search) params.set('search', search);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (formatFilter !== 'all') params.set('format', formatFilter);
      if (ticketTypeFilter !== 'all') params.set('ticketType', ticketTypeFilter);
      if (locationFilter) params.set('location', locationFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/events/public?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data.events);
      setTotalPages(data.pagination.totalPages);
      setTotalEvents(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, search, categoryFilter, formatFilter, ticketTypeFilter, locationFilter, dateFrom, dateTo, sortBy]);

  const hasFilters = search || categoryFilter !== 'all' || formatFilter !== 'all' || ticketTypeFilter !== 'all' || locationFilter || dateFrom || dateTo;

  if (loading && events.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Explore Events</h1>
            <p className="text-sm text-[var(--text-secondary)]">Discover public events open for registration</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} padding="md" className="h-full">
              <Skeleton className="h-40 w-full rounded-lg mb-3" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-1" />
              <Skeleton className="h-4 w-1/3" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Explore Events</h1>
          <p className="text-sm text-[var(--text-secondary)]">Discover public events open for registration</p>
        </div>
      </div>

      {/* Search & Filters */}
      <Card padding="md">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search events, organizers, categories..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-48 px-3 py-2 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] appearance-auto pr-10"
            >
              <option value="all">All Categories</option>
              {EVENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select
              value={formatFilter}
              onChange={e => { setFormatFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-40 px-3 py-2 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] appearance-auto pr-10"
            >
              <option value="all">All Formats</option>
              {EVENT_FORMATS.map(fmt => <option key={fmt} value={fmt}>{fmt}</option>)}
            </select>
            <select
              value={ticketTypeFilter}
              onChange={e => { setTicketTypeFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-40 px-3 py-2 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] appearance-auto pr-10"
            >
              <option value="all">All Types</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setPage(1); }}
              className="w-full sm:w-44 px-3 py-2 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] appearance-auto pr-10"
            >
              {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-[var(--divider)]">
            <Input
              placeholder="Location"
              value={locationFilter}
              onChange={e => { setLocationFilter(e.target.value); setPage(1); }}
              className="flex-1 min-w-[200px]"
            />
            <Input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full sm:w-44"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="w-full sm:w-44"
            />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => {
                setSearch(''); setCategoryFilter('all'); setFormatFilter('all');
                setTicketTypeFilter('all'); setLocationFilter(''); setDateFrom(''); setDateTo('');
                setPage(1);
              }} className="flex items-center gap-1">
                <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Events Grid */}
      {error && (
        <div className="rounded-lg border border-[var(--accent)]/40 bg-[var(--danger-surface)] p-4 text-center">
          <p className="text-[var(--danger)]">{error}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={fetchEvents}>Retry</Button>
        </div>
      )}

      {!error && events.length === 0 && !loading && (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-12 text-center">
          <Tag className="mx-auto h-12 w-12 text-[var(--text-muted)]" aria-hidden="true" />
          <h3 className="mt-4 font-medium text-[var(--text-primary)]">No events found</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {hasFilters ? 'Try adjusting your filters.' : 'No public events are currently available.'}
          </p>
        </div>
      )}

      {!error && events.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map(event => (
              <EventCard key={event.id} event={event} onClick={() => router.push(`/events/${event.id}`)} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <span className="px-4 text-sm text-[var(--text-secondary)]">Page {page} of {totalPages} ({totalEvents} events)</span>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({ event, onClick }: { event: PublicEvent; onClick: () => void }) {
  const isFree = !event.ticketPrice || event.ticketPrice === 0 || event.ticketType === 'free';
  const priceDisplay = isFree ? 'Free' : `${event.ticketCurrency || 'USD'} ${event.ticketPrice?.toLocaleString()}`;

  return (
    <Card padding="md" className="h-full cursor-pointer transition-shadow hover:shadow-lg" onClick={onClick}>
      {event.bannerImageUrl && (
        <div className="relative h-40 -mx-4 -mt-4 mb-4 rounded-t-lg overflow-hidden">
          <img src={event.bannerImageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-[var(--text-primary)] line-clamp-1 flex-1">{event.name}</h3>
        <Badge variant={isFree ? 'success' : 'warning'} className="text-xs shrink-0">{priceDisplay}</Badge>
      </div>
      <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">{event.description}</p>
      <div className="space-y-2 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /><span>{format(parseISO(event.startDate), 'MMM d, yyyy')}{event.endDate && event.endDate !== event.startDate ? ` – ${format(parseISO(event.endDate), 'MMM d, yyyy')}` : ''}</span></div>
        <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden="true" /><span>{event.venue || (event.format === 'virtual' ? 'Online' : 'Venue TBA')}</span></div>
        <div className="flex items-center gap-1.5"><TicketCheck className="h-3.5 w-3.5" aria-hidden="true" /><span>{event.currentRegistrations}/{event.participantCapacity || event.targetRegistrations || '∞'}</span></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {event.type && <Badge variant="outline" className="text-xs">{event.type}</Badge>}
        <Badge variant="outline" className="text-xs capitalize">{event.format}</Badge>
        {event.organizerInstitution && <Badge variant="outline" className="text-xs">{event.organizerInstitution}</Badge>}
      </div>
      <div className="mt-4 pt-3 border-t border-[var(--divider)] flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">{event.daysRemaining}d remaining</span>
        <Button size="sm" variant="secondary" className="flex items-center gap-1">
          View <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}