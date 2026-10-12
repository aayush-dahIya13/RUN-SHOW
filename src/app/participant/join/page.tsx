'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { JoinInvitationView } from '@/components/layout/participant/JoinInvitationView';

export default function JoinInvitationPage() {
  return (
    <ProtectedRoute role="participant">
      <JoinInvitationView />
    </ProtectedRoute>
  );
}