import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SubOrganizerDashboard } from '@/components/roles/SubOrganizerDashboard';

export default function SubOrganizerDashboardPage() {
  return <ProtectedRoute role="sub_organizer"><SubOrganizerDashboard /></ProtectedRoute>;
}
