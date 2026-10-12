import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ParticipantLayout } from '@/components/layout/ParticipantLayout';

export default function ParticipantDashboardPage() {
  return <ProtectedRoute role="participant"><ParticipantLayout /></ProtectedRoute>;
}