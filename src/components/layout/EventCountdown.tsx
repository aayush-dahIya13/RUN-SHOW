'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useDashboardStore } from '@/lib/dashboard-state';
import { Badge } from '@/components/ui/Badge';

export function EventCountdown() {
  const event = useDashboardStore(state => state.event);
  const eventDate = new Date(event.date);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => setNow(new Date()), 0);
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, []);

  if (!now) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="info" dot>Loading…</Badge>
        <Badge variant="neutral" dot>Calculating…</Badge>
      </div>
    );
  }

  const daysRemaining = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const eventStatus = daysRemaining > 0 ? 'Upcoming' : daysRemaining === 0 ? 'Today' : 'Completed';

  return (
    <div className="flex items-center gap-3">
      <Badge variant="info" dot>{eventStatus}</Badge>
      <Badge variant={daysRemaining <= 3 ? 'danger' : daysRemaining <= 7 ? 'warning' : 'success'} dot>
        {daysRemaining > 0 ? `${daysRemaining}d left` : 'Event day'}
      </Badge>
    </div>
  );
}

export function EventDateDisplay() {
  const event = useDashboardStore(state => state.event);
  const eventDate = new Date(event.date);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => setNow(new Date()), 0);
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, []);

  if (!now) {
    return <p className="text-sm text-slate-400 animate-pulse">Loading date…</p>;
  }

  const daysRemaining = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <p className="text-sm text-slate-400">
      {format(eventDate, 'EEEE, MMMM d, yyyy')} • {daysRemaining > 0 ? `${daysRemaining} days remaining` : daysRemaining === 0 ? 'Event starts today' : 'Event completed'}
    </p>
  );
}
