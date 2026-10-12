export type UserRole = 'organizer' | 'sub-organizer' | 'participant';

export type TeamResponsibility = 'marketing' | 'partnerships' | 'operations' | 'programme';

export interface SubOrganizerAssignment {
  id: string;
  email: string;
  teamResponsibility: TeamResponsibility;
  status: 'pending' | 'accepted' | 'rejected';
  assignedAt: string;
  acceptedAt?: string;
}

export interface DemoUser {
  email: string;
  role: UserRole;
  teamResponsibility?: TeamResponsibility;
  isSubOrganizerAssigned: boolean;
  subOrganizerAssignment?: SubOrganizerAssignment;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthState {
  // Session state
  isAuthenticated: boolean;
  user: DemoUser | null;
  
  // Flow state
  currentStep: 'login' | 'role-selection' | 'sub-organizer-assignment' | 'complete';
  pendingEmail: string | null;
  isSignupFlow: boolean;
  hasHydrated: boolean;
  
  // Sub-organizer management (organizer view)
  subOrganizerAssignments: SubOrganizerAssignment[];
  
  // Actions
  setPendingEmail: (email: string, isSignup: boolean) => void;
  setRole: (role: UserRole, teamResponsibility?: TeamResponsibility) => void;
  completeAuth: () => void;
  logout: () => void;
  resetFlow: () => void;
  restoreSession: () => void;
  
  // Sub-organizer management (organizer actions)
  addSubOrganizerAssignment: (email: string, teamResponsibility: TeamResponsibility) => void;
  updateSubOrganizerStatus: (assignmentId: string, status: 'accepted' | 'rejected') => void;
  removeSubOrganizerAssignment: (assignmentId: string) => void;
  
  // Sub-organizer actions (sub-organizer view)
  acceptAssignment: (assignmentId: string) => void;
  rejectAssignment: (assignmentId: string) => void;
  
  // Check if email exists in demo
  checkEmailExists: (email: string) => boolean;
  getUserByEmail: (email: string) => DemoUser | null;
}

export const ROLE_DESCRIPTIONS: Record<UserRole, { title: string; description: string; permissions: string[] }> = {
  organizer: {
    title: 'Organizer',
    description: 'The main event organizer with full control over the event.',
    permissions: [
      'Create and configure events',
      'Generate and manage the event operating plan',
      'Assign tasks and invite/assign sub-organizers',
      'View overall event status, risks, and recommendations',
      'Access all dashboard views and analytics',
    ],
  },
  'sub-organizer': {
    title: 'Sub-organizer',
    description: 'A team member assigned by the main organizer with specific responsibilities.',
    permissions: [
      'View assigned event information',
      'See and update permitted tasks',
      'Access role-relevant operations, marketing, partnerships, or programme workflows',
      'Must not automatically receive main-organizer permissions',
    ],
  },
  participant: {
    title: 'Participant',
    description: 'A person attending or participating in an event.',
    permissions: [
      'View their event information',
      'Access participant-facing dashboard',
      'Must not receive organizer-only functionality',
    ],
  },
};

export const TEAM_RESPONSIBILITIES: Record<TeamResponsibility, { label: string; description: string }> = {
  marketing: {
    label: 'Marketing',
    description: 'Registrations, outreach campaigns, social media, attendee acquisition',
  },
  partnerships: {
    label: 'Partnerships',
    description: 'Sponsor relations, partner confirmations, benefit delivery, booth coordination',
  },
  operations: {
    label: 'Operations',
    description: 'Venue, AV, catering, check-in, logistics, on-site execution',
  },
  programme: {
    label: 'Programme',
    description: 'Speaker management, session scheduling, content coordination, travel',
  },
};
