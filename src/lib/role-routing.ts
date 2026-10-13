import type { AccountRole } from './types';

export function destinationForRole(role: AccountRole): string {
  switch (role) {
    case 'organizer': return '/organizer/dashboard';
    case 'sub_organizer': return '/sub-organizer/dashboard';
    case 'participant': return '/participant/dashboard';
    default: return '/login';
  }
}
