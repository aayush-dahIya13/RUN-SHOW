'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { EventDetailsPage } from '@/components/layout/participant/EventDetailsPage';

export default function EventDetailsPageRoute() {
  return (
    <ProtectedRoute role="participant">
      <EventDetailsPage />
    </ProtectedRoute>
  );
}