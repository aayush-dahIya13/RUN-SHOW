'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SupportCentreView } from '@/components/layout/participant/SupportCentreView';

export default function SupportCentrePage() {
  return (
    <ProtectedRoute role="participant">
      <SupportCentreView />
    </ProtectedRoute>
  );
}