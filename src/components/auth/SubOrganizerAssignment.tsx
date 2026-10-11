'use client';

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserPlus, 
  UserCheck, 
  UserX, 
  Mail, 
  ChevronDown, 
  ChevronUp,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Megaphone,
  Handshake,
  Settings,
  Calendar,
  Shield,
  Briefcase
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { TEAM_RESPONSIBILITIES, TeamResponsibility, type SubOrganizerAssignment } from '@/lib/auth-types';

const teamIcons = {
  marketing: Megaphone,
  partnerships: Handshake,
  operations: Settings,
  programme: Calendar,
};

const teamColors = {
  marketing: 'from-cyan-500 to-blue-600',
  partnerships: 'from-purple-500 to-pink-600',
  operations: 'from-orange-500 to-red-600',
  programme: 'from-green-500 to-teal-600',
};

export function SubOrganizerAssignment() {
  const { subOrganizerAssignments, addSubOrganizerAssignment, updateSubOrganizerStatus, removeSubOrganizerAssignment } = useAuthStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newTeam, setNewTeam] = useState<TeamResponsibility>('marketing');
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(undefined);

    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setFormError('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Please enter a valid email address');
      return;
    }

    // Check if already assigned
    const existing = subOrganizerAssignments.find(a => a.email === email);
    if (existing) {
      setFormError('This email already has a team assignment');
      return;
    }

    addSubOrganizerAssignment(email, newTeam);
    setNewEmail('');
    setShowAddForm(false);
  };

  const getStatusIcon = (status: SubOrganizerAssignment['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'accepted': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusLabel = (status: SubOrganizerAssignment['status']) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
    }
  };

  const getStatusColor = (status: SubOrganizerAssignment['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'accepted': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/10 border-red-500/20';
    }
  };

  const pendingAssignments = subOrganizerAssignments.filter(a => a.status === 'pending');
  const acceptedAssignments = subOrganizerAssignments.filter(a => a.status === 'accepted');
  const rejectedAssignments = subOrganizerAssignments.filter(a => a.status === 'rejected');

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-slate-950" aria-hidden="true" />
            </div>
            Team Management
          </h2>
          <p className="text-slate-400 mt-1">Invite and manage sub-organizers for your event</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="whitespace-nowrap">
          <UserPlus className="w-4 h-4" aria-hidden="true" />
          Add Team Member
        </Button>
      </motion.div>

      {/* Add Member Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6"
          >
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <h3 className="font-semibold text-slate-100">Invite Sub-organizer</h3>
              <p className="text-sm text-slate-400">Enter their email and select their team responsibility</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="suborg-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" aria-hidden="true" />
                    <Input
                      id="suborg-email"
                      type="email"
                      placeholder="teammate@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      error={formError}
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="suborg-team" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Team Responsibility
                  </label>
                  <Select
                    id="suborg-team"
                    value={newTeam}
                    onChange={(e) => setNewTeam(e.target.value as TeamResponsibility)}
                    options={Object.entries(TEAM_RESPONSIBILITIES).map(([value, data]) => ({ 
                      value, 
                      label: data.label 
                    }))}
                  />
                </div>
              </div>

              {formError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-400 flex items-center gap-1.5"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  {formError}
                </motion.p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  Send Invitation
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <Card variant="glass" padding="md" className="border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{pendingAssignments.length}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
          </div>
        </Card>
        <Card variant="glass" padding="md" className="border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{acceptedAssignments.length}</p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
          </div>
        </Card>
        <Card variant="glass" padding="md" className="border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{rejectedAssignments.length}</p>
              <p className="text-xs text-slate-500">Declined</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Team Members List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {/* Active Team Members */}
        {(acceptedAssignments.length > 0 || pendingAssignments.length > 0) && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4" aria-hidden="true" />
              Team Members ({acceptedAssignments.length + pendingAssignments.length})
            </h3>
            <div className="space-y-2">
              {acceptedAssignments.map(assignment => (
                <TeamMemberCard
                  key={assignment.id}
                  assignment={assignment}
                  isExpanded={expandedId === assignment.id}
                  onToggle={() => setExpandedId(expandedId === assignment.id ? null : assignment.id)}
                  onRemove={() => removeSubOrganizerAssignment(assignment.id)}
                />
              ))}
              {pendingAssignments.map(assignment => (
                <TeamMemberCard
                  key={assignment.id}
                  assignment={assignment}
                  isExpanded={expandedId === assignment.id}
                  onToggle={() => setExpandedId(expandedId === assignment.id ? null : assignment.id)}
                  onSimulateAccept={() => updateSubOrganizerStatus(assignment.id, 'accepted')}
                  onSimulateReject={() => updateSubOrganizerStatus(assignment.id, 'rejected')}
                  onRemove={() => removeSubOrganizerAssignment(assignment.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Declined */}
        {rejectedAssignments.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
              Declined Invitations
            </h3>
            <div className="space-y-2">
              {rejectedAssignments.map(assignment => (
                <TeamMemberCard
                  key={assignment.id}
                  assignment={assignment}
                  isExpanded={false}
                  onToggle={() => {}}
                  onRemove={() => removeSubOrganizerAssignment(assignment.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {subOrganizerAssignments.length === 0 && (
          <Card variant="glass" padding="lg" className="border-slate-800/50 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-slate-500" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium text-slate-100 mb-2">No team members yet</h3>
            <p className="text-slate-400 mb-4">Invite sub-organizers to help manage your event</p>
            <Button onClick={() => setShowAddForm(true)}>
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              Invite First Member
            </Button>
          </Card>
        )}
      </motion.div>

      {/* Demo Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-4 bg-slate-900/30 border border-slate-800/50 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-slate-400">
            <p className="font-medium text-slate-300">Demo Mode</p>
            <p>Invitations are simulated — no real emails are sent. Use the &quot;Accept&quot;/&quot;Reject&quot; buttons to simulate team member responses.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface TeamMemberCardProps {
  assignment: SubOrganizerAssignment;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onSimulateAccept?: () => void;
  onSimulateReject?: () => void;
}

function TeamMemberCard({ 
  assignment, 
  isExpanded, 
  onToggle, 
  onRemove,
  onSimulateAccept,
  onSimulateReject 
}: TeamMemberCardProps) {
  const teamInfo = TEAM_RESPONSIBILITIES[assignment.teamResponsibility];
  const Icon = teamIcons[assignment.teamResponsibility];
  const gradient = teamColors[assignment.teamResponsibility];
  const statusIcon = getStatusIcon(assignment.status);
  const statusLabel = getStatusLabel(assignment.status);
  const statusColor = getStatusColor(assignment.status);

  function getStatusIcon(status: SubOrganizerAssignment['status']) {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'accepted': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-400" />;
    }
  }

  function getStatusLabel(status: SubOrganizerAssignment['status']) {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Active';
      case 'rejected': return 'Declined';
    }
  }

  function getStatusColor(status: SubOrganizerAssignment['status']) {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'accepted': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/10 border-red-500/20';
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors text-left"
        aria-expanded={isExpanded}
      >
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-6 h-6 text-slate-950" aria-hidden="true" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-100 truncate">{assignment.email}</p>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-sm text-slate-400 truncate">{teamInfo.label} — {teamInfo.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:block">
            Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
          </span>
          <ChevronDown 
            className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            aria-hidden="true" 
          />
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-800/50 p-4 bg-slate-900/30"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Team Responsibility</p>
                <p className="text-sm font-medium text-slate-100 flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: 'var(--tw-gradient-from)' }} aria-hidden="true" />
                  {teamInfo.label}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  {statusIcon}
                  <span className={statusColor.replace('border', '').replace('bg-', 'text-')}>{statusLabel}</span>
                </p>
              </div>
              {assignment.acceptedAt && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-500 mb-1">Accepted</p>
                  <p className="text-sm font-medium text-slate-100">
                    {new Date(assignment.acceptedAt).toLocaleDateString()} at {new Date(assignment.acceptedAt).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {assignment.status === 'pending' && onSimulateAccept && (
                <Button size="sm" variant="primary" onClick={onSimulateAccept} className="flex-1 sm:flex-none">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Simulate Accept
                </Button>
              )}
              {assignment.status === 'pending' && onSimulateReject && (
                <Button size="sm" variant="danger" onClick={onSimulateReject} className="flex-1 sm:flex-none">
                  <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  Simulate Reject
                </Button>
              )}
              {assignment.status === 'accepted' && (
                <Button size="sm" variant="danger" onClick={onRemove} className="flex-1 sm:flex-none">
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Remove from Team
                </Button>
              )}
              {assignment.status === 'rejected' && (
                <Button size="sm" variant="ghost" onClick={onRemove} className="flex-1 sm:flex-none">
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Remove Record
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
