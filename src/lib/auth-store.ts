'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, DemoUser, SubOrganizerAssignment, UserRole, TeamResponsibility } from './auth-types';

const STORAGE_KEY = 'eventpilot-demo-auth';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getStoredUsers(): Record<string, DemoUser> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY + '-users');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredUsers(users: Record<string, DemoUser>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY + '-users', JSON.stringify(users));
}

function getStoredAssignments(): SubOrganizerAssignment[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY + '-assignments');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setStoredAssignments(assignments: SubOrganizerAssignment[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY + '-assignments', JSON.stringify(assignments));
}

const initialState = {
  isAuthenticated: false,
  user: null,
  currentStep: 'login' as const,
  pendingEmail: null,
  isSignupFlow: false,
  hasHydrated: false,
  subOrganizerAssignments: getStoredAssignments(),
};

function hasValidAssignment(user: DemoUser, assignments: SubOrganizerAssignment[]): boolean {
  if (user.role !== 'sub-organizer') return true;

  return Boolean(
    user.teamResponsibility &&
      assignments.some(
        assignment =>
          assignment.email === user.email &&
          assignment.teamResponsibility === user.teamResponsibility &&
          (assignment.status === 'pending' || assignment.status === 'accepted')
      )
  );
}

function isValidStoredSession(user: DemoUser | null, assignments: SubOrganizerAssignment[]): user is DemoUser {
  if (!user || !user.email || !['organizer', 'sub-organizer', 'participant'].includes(user.role)) {
    return false;
  }

  const storedUser = getStoredUsers()[user.email];
  return Boolean(
    storedUser &&
      storedUser.role === user.role &&
      storedUser.teamResponsibility === user.teamResponsibility &&
      hasValidAssignment(storedUser, assignments)
  );
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setPendingEmail: (email: string, isSignup: boolean) => {
        const normalizedEmail = email.toLowerCase().trim();
        const users = getStoredUsers();
        const existingUser = users[normalizedEmail];

        if (!isSignup && existingUser && hasValidAssignment(existingUser, get().subOrganizerAssignments)) {
          set({
            isAuthenticated: true,
            user: existingUser,
            currentStep: 'complete',
            pendingEmail: null,
            isSignupFlow: false,
          });
          return;
        }

        set({
          isAuthenticated: false,
          user: null,
          pendingEmail: normalizedEmail,
          isSignupFlow: isSignup || !existingUser,
          currentStep: 'role-selection',
        });
      },

      setRole: (role: UserRole, teamResponsibility?: TeamResponsibility) => {
        const { pendingEmail, isSignupFlow, subOrganizerAssignments } = get();
        if (!pendingEmail) return;

        const users = getStoredUsers();
        const now = new Date().toISOString();

        if (role === 'sub-organizer') {
          // Check if user has a pending or accepted assignment
          const assignment = subOrganizerAssignments.find(
            a => a.email === pendingEmail && (a.status === 'pending' || a.status === 'accepted')
          );
          
          if (!assignment) {
            // No assignment exists - cannot select sub-organizer role
            return;
          }
          
          // Use the assigned team responsibility
          const user: DemoUser = {
            email: pendingEmail,
            role: 'sub-organizer',
            teamResponsibility: assignment.teamResponsibility,
            isSubOrganizerAssigned: true,
            subOrganizerAssignment: assignment,
            createdAt: isSignupFlow ? now : (users[pendingEmail]?.createdAt || now),
            lastLoginAt: now,
          };
          
          setStoredUsers({ ...users, [pendingEmail]: user });
          
          set({
            user,
            isAuthenticated: true,
            currentStep: 'complete',
          });
          return;
        }

        // Organizer or Participant
        const user: DemoUser = {
          email: pendingEmail,
          role,
          teamResponsibility,
          isSubOrganizerAssigned: false,
          createdAt: isSignupFlow ? now : (users[pendingEmail]?.createdAt || now),
          lastLoginAt: now,
        };

        setStoredUsers({ ...users, [pendingEmail]: user });

        set({
          user,
          isAuthenticated: true,
          currentStep: 'complete',
        });
      },

      completeAuth: () => {
        set({ currentStep: 'complete' });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          currentStep: 'login',
          pendingEmail: null,
          isSignupFlow: false,
        });
      },

      resetFlow: () => {
        set({
          currentStep: 'login',
          pendingEmail: null,
          isSignupFlow: false,
        });
      },

      restoreSession: () => {
        const assignments = getStoredAssignments();
        const { isAuthenticated, user, currentStep } = get();

        if (isAuthenticated && currentStep === 'complete' && isValidStoredSession(user, assignments)) {
          const storedUser = getStoredUsers()[user.email];
          set({
            user: storedUser ?? user,
            subOrganizerAssignments: assignments,
            hasHydrated: true,
          });
          return;
        }

        if (!isAuthenticated && currentStep === 'role-selection' && get().pendingEmail) {
          set({ subOrganizerAssignments: assignments, hasHydrated: true });
          return;
        }

        set({
          ...initialState,
          subOrganizerAssignments: assignments,
          hasHydrated: true,
        });
      },

      // Organizer actions for managing sub-organizers
      addSubOrganizerAssignment: (email: string, teamResponsibility: TeamResponsibility) => {
        const normalizedEmail = email.toLowerCase().trim();
        const assignments = getStoredAssignments();
        
        // Check if already assigned
        const existing = assignments.find(a => a.email === normalizedEmail);
        if (existing) return;

        const newAssignment: SubOrganizerAssignment = {
          id: generateId(),
          email: normalizedEmail,
          teamResponsibility,
          status: 'pending',
          assignedAt: new Date().toISOString(),
        };

        const updated = [...assignments, newAssignment];
        setStoredAssignments(updated);
        set({ subOrganizerAssignments: updated });
      },

      updateSubOrganizerStatus: (assignmentId: string, status: 'accepted' | 'rejected') => {
        const assignments = getStoredAssignments();
        const updated = assignments.map(a => 
          a.id === assignmentId 
            ? { ...a, status, acceptedAt: new Date().toISOString() }
            : a
        );
        setStoredAssignments(updated);
        set({ subOrganizerAssignments: updated });

        // If accepted, also update the user record
        if (status === 'accepted') {
          const assignment = updated.find(a => a.id === assignmentId);
          if (assignment) {
            const users = getStoredUsers();
            const user = users[assignment.email];
            if (user) {
              const updatedUser: DemoUser = {
                ...user,
                role: 'sub-organizer',
                teamResponsibility: assignment.teamResponsibility,
                isSubOrganizerAssigned: true,
                subOrganizerAssignment: assignment,
                lastLoginAt: new Date().toISOString(),
              };
              setStoredUsers({ ...users, [assignment.email]: updatedUser });
            }
          }
        }
      },

      removeSubOrganizerAssignment: (assignmentId: string) => {
        const assignments = getStoredAssignments();
        const assignment = assignments.find(a => a.id === assignmentId);
        const updated = assignments.filter(a => a.id !== assignmentId);
        setStoredAssignments(updated);
        set({ subOrganizerAssignments: updated });

        // Also update user if they existed
        if (assignment) {
          const users = getStoredUsers();
          const user = users[assignment.email];
          if (user && user.role === 'sub-organizer') {
            // Reset to participant or remove
            const updatedUser: DemoUser = {
              ...user,
              role: 'participant',
              teamResponsibility: undefined,
              isSubOrganizerAssigned: false,
              subOrganizerAssignment: undefined,
            };
            setStoredUsers({ ...users, [assignment.email]: updatedUser });
          }
        }
      },

      // Sub-organizer actions
      acceptAssignment: (assignmentId: string) => {
        get().updateSubOrganizerStatus(assignmentId, 'accepted');
      },

      rejectAssignment: (assignmentId: string) => {
        get().updateSubOrganizerStatus(assignmentId, 'rejected');
      },

      checkEmailExists: (email: string) => {
        const users = getStoredUsers();
        return email.toLowerCase().trim() in users;
      },

      getUserByEmail: (email: string) => {
        const users = getStoredUsers();
        return users[email.toLowerCase().trim()] || null;
      },
    }),
    {
      name: 'eventpilot-auth-store',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        currentStep: state.currentStep,
        pendingEmail: state.pendingEmail,
        isSignupFlow: state.isSignupFlow,
      }),
    }
  )
);

// Helper to initialize assignments on client side
export function initializeAuthStore() {
  if (typeof window !== 'undefined') {
    useAuthStore.getState().restoreSession();
  }
}
