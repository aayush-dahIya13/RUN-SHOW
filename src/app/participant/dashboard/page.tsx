import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ParticipantDashboard } from '@/components/roles/ParticipantDashboard';

export default function ParticipantDashboardPage() {
  return <ProtectedRoute role="participant"><ParticipantDashboard /></ProtectedRoute>;
}
