'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  UserCheck, 
  User, 
  CheckCircle2,
  Briefcase,
  Calendar,
  Megaphone,
  Handshake,
  Settings,
  LayoutDashboard,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/Button';
import { ROLE_DESCRIPTIONS, UserRole, TEAM_RESPONSIBILITIES } from '@/lib/auth-types';

interface RoleCardProps {
  role: UserRole;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

function RoleCard({ role, isSelected, onSelect, disabled, disabledReason }: RoleCardProps) {
  const { title, description, permissions } = ROLE_DESCRIPTIONS[role];
  
  const roleIcons = {
    organizer: LayoutDashboard,
    'sub-organizer': Briefcase,
    participant: User,
  };
  
  const Icon = roleIcons[role];
  const gradientMap = {
    organizer: 'from-cyan-500 to-blue-600',
    'sub-organizer': 'from-purple-500 to-pink-600',
    participant: 'from-green-500 to-teal-600',
  };

  return (
    <motion.button
      onClick={onSelect}
      disabled={disabled}
      whileHover={!disabled ? { y: -2, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3), 0 0 20px rgba(6, 182, 212, 0.1)' } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`relative h-full w-full rounded-2xl border-2 transition-all duration-300 text-left flex flex-col ${
        isSelected
          ? 'border-cyan-500/50 bg-cyan-500/5 bg-gradient-to-br from-cyan-500/5 to-transparent'
          : 'border-slate-800/50 hover:border-cyan-500/30 bg-slate-900/30'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      role="radio"
      aria-checked={isSelected}
      aria-disabled={disabled}
    >
      <div className="p-5 flex flex-col h-full">
        {/* Header Row - consistent across all three cards */}
        <div className="flex items-center gap-3">
          <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${gradientMap[role]} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-slate-950" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="text-base font-semibold text-slate-100">{title}</h3>
            {isSelected && (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-cyan-400" aria-hidden="true" />
            )}
          </div>
        </div>
        
        {/* Description */}
        <p className="mt-3 text-xs leading-4 text-slate-400">{description}</p>
        
        {/* Permission List */}
        <ul className="mt-3 space-y-1.5" role="list">
          {permissions.map((permission, index) => (
            <li key={index} className="flex items-start gap-1.5 text-[11px] leading-4 text-slate-500">
              <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-cyan-400" aria-hidden="true" />
              <span className="break-words">{permission}</span>
            </li>
          ))}
        </ul>
        
        {/* Sub-organizer Invitation Warning */}
        {role === 'sub-organizer' && disabledReason && (
          <div className="mt-4 flex w-full items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs leading-4 text-red-300" role="note">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <p><span className="font-medium">Invitation required.</span> {disabledReason}</p>
          </div>
        )}

        {isSelected && !disabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 border-2 border-cyan-500/50 rounded-2xl pointer-events-none"
          />
        )}
      </div>
    </motion.button>
  );
}

export function RoleSelection() {
  const { user, pendingEmail, setRole, resetFlow, subOrganizerAssignments } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Check if pending email has a sub-organizer assignment
  const hasSubOrgAssignment = pendingEmail 
    ? subOrganizerAssignments.some(a => a.email === pendingEmail && (a.status === 'pending' || a.status === 'accepted'))
    : false;

  const subOrgAssignment = pendingEmail
    ? subOrganizerAssignments.find(a => a.email === pendingEmail && (a.status === 'pending' || a.status === 'accepted'))
    : null;

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    
    if (role === 'sub-organizer') {
      if (hasSubOrgAssignment && subOrgAssignment) {
        setRole('sub-organizer', subOrgAssignment.teamResponsibility);
      }
    } else {
      setRole(role);
    }
  };

  // If user is already authenticated, don't render (AuthPage will handle routing)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-5xl"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.25 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-3">
            <svg className="w-7 h-7 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Select your role</h1>
          <p className="text-slate-400 mt-1.5 max-w-xl mx-auto">
            {pendingEmail ? (
              <>
                Continuing as <strong className="text-slate-100">{pendingEmail}</strong>
              </>
            ) : (
              'Choose how you\'ll use EventPilot AI'
            )}
          </p>
        </motion.div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <RoleCard
            role="organizer"
            isSelected={selectedRole === 'organizer'}
            onSelect={() => handleRoleSelect('organizer')}
          />
          <RoleCard
            role="sub-organizer"
            isSelected={selectedRole === 'sub-organizer'}
            onSelect={() => handleRoleSelect('sub-organizer')}
            disabled={!hasSubOrgAssignment}
            disabledReason={!hasSubOrgAssignment 
              ? 'You must be invited by an organizer to join as a sub-organizer' 
              : undefined}
          />
          <RoleCard
            role="participant"
            isSelected={selectedRole === 'participant'}
            onSelect={() => handleRoleSelect('participant')}
          />
        </div>

        {/* Sub-organizer Assignment Info */}
        {hasSubOrgAssignment && subOrgAssignment && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.25 }}
            className="mb-5 p-3 bg-slate-900/50 border border-slate-800/50 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-purple-400" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium text-slate-100 text-sm">Sub-organizer invitation found</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  You&apos;ve been assigned to <strong className="text-purple-400">
                    {TEAM_RESPONSIBILITIES[subOrgAssignment.teamResponsibility].label}
                  </strong> team. Selecting &quot;Sub-organizer&quot; will use this assignment.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Back to login */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.25 }}
          className="text-center"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFlow}
            className="text-slate-400 hover:text-slate-300"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to email entry
          </Button>
        </motion.div>

        {/* Demo notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.25 }}
          className="mt-6 text-center"
        >
          <details className="text-slate-500 text-sm">
            <summary className="cursor-pointer flex items-center justify-center gap-1.5 hover:text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Role details
            </summary>
            <div className="mt-3 p-4 bg-slate-900/50 rounded-xl border border-slate-800/50 text-left text-xs space-y-3 max-h-56 overflow-y-auto">
              {Object.entries(ROLE_DESCRIPTIONS).map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                  <p className="font-medium text-slate-300 flex items-center gap-2">
                    {key === 'organizer' && <LayoutDashboard className="w-4 h-4 text-cyan-400" />}
                    {key === 'sub-organizer' && <Briefcase className="w-4 h-4 text-purple-400" />}
                    {key === 'participant' && <User className="w-4 h-4 text-green-400" />}
                    {value.title}
                  </p>
                  <p className="text-slate-400 pl-6 text-xs">{value.description}</p>
                  <ul className="pl-6 space-y-0.5">
                    {value.permissions.map((perm, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <svg className="w-2.5 h-2.5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {perm}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              
              <div className="pt-3 border-t border-slate-800/50 space-y-2">
                <div>
                  <p className="font-medium text-slate-300 mb-1 flex items-center gap-2 text-xs">
                    <Megaphone className="w-3.5 h-3.5 text-cyan-400" /> Marketing
                  </p>
                  <p className="text-slate-500 text-[11px] pl-5.5">Registrations, outreach campaigns, social media, attendee acquisition</p>
                </div>
                <div>
                  <p className="font-medium text-slate-300 mb-1 flex items-center gap-2 text-xs">
                    <Handshake className="w-3.5 h-3.5 text-cyan-400" /> Partnerships
                  </p>
                  <p className="text-slate-500 text-[11px] pl-5.5">Sponsor relations, partner confirmations, benefit delivery, booth coordination</p>
                </div>
                <div>
                  <p className="font-medium text-slate-300 mb-1 flex items-center gap-2 text-xs">
                    <Settings className="w-3.5 h-3.5 text-cyan-400" /> Operations
                  </p>
                  <p className="text-slate-500 text-[11px] pl-5.5">Venue, AV, catering, check-in, logistics, on-site execution</p>
                </div>
                <div>
                  <p className="font-medium text-slate-300 mb-1 flex items-center gap-2 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Programme
                  </p>
                  <p className="text-slate-500 text-[11px] pl-5.5">Speaker management, session scheduling, content coordination, travel</p>
                </div>
              </div>
            </div>
          </details>
        </motion.div>
      </motion.div>
    </div>
  );
}
