'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ExploreEventsView } from '@/components/layout/participant/ExploreEventsView';

export default function ExploreEventsPage() {
  return (
    <ProtectedRoute role="participant">
      <ExploreEventsView />
    </ProtectedRoute>
  );
}