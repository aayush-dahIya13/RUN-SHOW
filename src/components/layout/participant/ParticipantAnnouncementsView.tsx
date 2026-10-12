'use client';

import { useState, useMemo } from 'react';
import { Search, FilterX, Mail, Bell, CalendarDays, RadioTower, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { useDemoSession } from '@/lib/demo-auth';
import { useDashboardStore } from '@/lib/dashboard-state';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

const CATEGORIES = ['General', 'Schedule Change', 'Venue Update', 'Important', 'Emergency'] as const;

export function ParticipantAnnouncementsView() {
  const session = useDemoSession();
  const { events, participantEvents, announcements } = useDashboardStore();
  const links = participantEvents.filter(link => link.accountId === session?.id);
  const myEvents = links.map(link => ({ link, event: events.find(item => item.id === link.eventId) })).filter((item): item is { link: typeof links[number]; event: NonNullable<typeof item.event> } => !!item.event);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selected = myEvents.find(item => item.event.id === selectedEventId) ?? myEvents[0];
  const event = selected?.event;
  const eventAnnouncements = announcements.filter(item => item.eventId === event?.id);

  if (!myEvents.length) {
    return (
      <Card padding="lg" className="text-center">
        <RadioTower className="mx-auto h-12 w-12 text-[var(--text-muted)]" aria-hidden="true" />
        <h2 className="mt-4 font-semibold text-[var(--text-primary)]">No events are linked to this account</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">An event organizer must associate an event with your participant account.</p>
      </Card>
    );
  }

  if (!event) return null;

  // Filter announcements
  const filteredAnnouncements = useMemo(() => {
    return eventAnnouncements.filter(item => {
      const matchesSearch = search === '' || item.title.toLowerCase().includes(search.toLowerCase()) || item.message.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      // Since we don't have read status in the model, we'll simulate it or skip this filter
      const matchesRead = readFilter === 'all'; // Would need read tracking in the model
      return matchesSearch && matchesCategory && matchesRead;
    });
  }, [eventAnnouncements, search, categoryFilter, readFilter]);

  const hasFilters = search || categoryFilter !== 'all' || readFilter !== 'all';

  return (
    <div className="space-y-6">
      {myEvents.length > 1 && (
        <div className="flex flex-wrap gap-2" aria-label="Choose event">
          {myEvents.map(item => (
            <Button key={item.event.id} type="button" variant={item.event.id === event.id ? 'primary' : 'secondary'} size="sm" onClick={() => setSelectedEventId(item.event.id)}>
              {item.event.name}
            </Button>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card padding="md">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              id="announcement-search"
              label="Search announcements"
              placeholder="Search by title or content..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1"
            />
            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] focus:border-[var(--action-primary)] appearance-auto pr-10"
              >
                <option value="all">All categories</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <select
                value={readFilter}
                onChange={e => setReadFilter(e.target.value as any)}
                className="w-full sm:w-40 px-3 py-2 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] focus:border-[var(--action-primary)] appearance-auto pr-10"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategoryFilter('all'); setReadFilter('all'); }} className="flex items-center gap-1">
              <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      {/* Announcements List */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)]">Announcements</h2>
          <span className="text-xs text-[var(--text-secondary)]">{filteredAnnouncements.length} of {eventAnnouncements.length} announcements</span>
        </div>

        {filteredAnnouncements.length > 0 ? (
          <div className="mt-4 space-y-3">
            {filteredAnnouncements.map(item => {
              const isExpanded = expandedId === item.id;
              return (
                <article key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden">
                  <button
                    type="button"
                    className="w-full p-4 text-left flex items-center justify-between gap-4"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-[var(--text-primary)] truncate">{item.title}</h3>
                        {item.isDemo && <Badge variant="secondary" className="text-xs">Demo update</Badge>}
                        <Badge variant="outline" className="text-xs">General</Badge>
                        <Badge variant={item.priority === 'urgent' ? 'danger' : item.priority === 'high' ? 'warning' : 'secondary'} className="text-xs">
                          {item.priority || 'Normal'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">{item.message}</p>
                      <p className="mt-2 text-xs text-[var(--text-muted)]">{publishedLabel(item.publishedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Bell className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-[var(--divider)] p-4 bg-[var(--surface-elevated)]">
                      <p className="text-sm text-[var(--text-primary)]">{item.message}</p>
                      <div className="mt-4 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                        <span>Published: {publishedLabel(item.publishedAt)}</span>
                        <span>Event: {event.name}</span>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 py-8 text-center">
            <Mail className="mx-auto h-10 w-10 text-[var(--text-muted)]" aria-hidden="true" />
            <h3 className="mt-3 font-medium text-[var(--text-primary)]">No announcements found</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{hasFilters ? 'Try adjusting your filters.' : 'No announcements have been published for this event.'}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function publishedLabel(value: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, 'MMM d, yyyy · h:mm a') : 'Date unavailable';
}