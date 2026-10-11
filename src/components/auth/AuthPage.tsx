'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuthStore, initializeAuthStore } from '@/lib/auth-store';
import { useDashboardStore } from '@/lib/dashboard-state';
import { LoginPage } from './LoginPage';
import { RoleSelection } from './RoleSelection';
import { SubOrganizerAssignment } from './SubOrganizerAssignment';
import { ParticipantView } from './ParticipantView';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export function AuthPage() {
  const { 
    isAuthenticated, 
    user, 
    currentStep, 
    hasHydrated,
  } = useAuthStore();
  
  const { setSelectedRole, setSelectedView, selectedRole } = useDashboardStore();
  // Initialize auth store on client side
  useEffect(() => {
    initializeAuthStore();
  }, []);

  // Sync auth role with dashboard role
  useEffect(() => {
    if (isAuthenticated && user) {
      const roleMap: Record<string, 'marketing' | 'partnerships' | 'operations' | 'programme' | 'leadership'> = {
        organizer: 'leadership',
        'sub-organizer': user.teamResponsibility || 'marketing',
        participant: 'leadership',
      };
      
      const dashboardRole = roleMap[user.role];
      if (dashboardRole && dashboardRole !== selectedRole) {
        setSelectedRole(dashboardRole);
      }
      
      // Set appropriate default view based on role
      if (user.role === 'organizer') {
        setSelectedView('overview');
      } else if (user.role === 'sub-organizer') {
        setSelectedView('operations');
      } else if (user.role === 'participant') {
        // Participant uses their own view, not dashboard
      }
    }
  }, [isAuthenticated, user, selectedRole, setSelectedRole, setSelectedView]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-slate-400">Loading...</p>
        </motion.div>
      </div>
    );
  }

  // 1. No session: show login page
  if (!isAuthenticated && currentStep === 'login') {
    return <LoginPage />;
  }

  // 2. No session but at role-selection step: show role selection
  if (!isAuthenticated && currentStep === 'role-selection') {
    return <RoleSelection />;
  }

  // 3. Organizer at sub-organizer-assignment step (can be authenticated or not)
  if (currentStep === 'sub-organizer-assignment' && user?.role === 'organizer') {
    return <SubOrganizerAssignment />;
  }

  // 4. Authenticated user with complete step: route to appropriate view
  if (isAuthenticated && user && currentStep === 'complete') {
    // Participant view
    if (user.role === 'participant') {
      return <ParticipantView />;
    }
    
    // Organizer/Sub-organizer dashboard
    if (user.role === 'organizer' || user.role === 'sub-organizer') {
      return (
        <div className="min-h-screen">
          <DashboardLayout />
        </div>
      );
    }
  }

  // Any authenticated state outside a completed session is invalid.
  return <LoginPage />;
}
