'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Clock, User, Flag, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { STATUS_COLORS } from '@/lib/demo-data';
import { Risk, Role, Task, TaskStatus } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
};

const STATUS_ICONS = {
  pending: Clock,
  'in-progress': AlertCircle,
  completed: CheckCircle,
  blocked: XCircle,
};

const ROLE_WORKFLOW_COPY: Record<Role, string> = {
  marketing: 'Campaigns, registrations, conversion, and content tasks',
  partnerships: 'Sponsors, partner confirmations, and follow-ups',
  operations: 'Venue, catering, equipment, staffing, and logistics',
  programme: 'Speakers, mentors, schedule, and session readiness',
  leadership: 'Overall readiness, critical risks, and escalations',
};

function RoleWorkflowSummary({ role, tasks, risks }: { role: Role; tasks: Task[]; risks: Risk[] }) {
  const roleTasks = role === 'leadership' ? tasks : tasks.filter(task => task.assignee === role);
  const roleRisks = role === 'leadership' ? risks : risks.filter(risk => risk.owner === role);
  const urgentTasks = roleTasks.filter(task => task.priority === 'urgent' || task.priority === 'high').length;
  const blockedTasks = roleTasks.filter(task => task.status === 'blocked').length;
  const openRisks = roleRisks.filter(risk => risk.status === 'open' || risk.status === 'in-progress').length;

  return (
    <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">{role === 'leadership' ? 'Leadership Workflow' : `${role.charAt(0).toUpperCase()}${role.slice(1)} Workflow`}</p>
          <p className="text-sm text-slate-400 mt-1">{ROLE_WORKFLOW_COPY[role]}</p>
          <p className="text-xs text-slate-500 mt-2">Prototype role switching only. Authentication and real permissions are not implemented.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center min-w-[260px]">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
            <p className="text-lg font-semibold text-slate-100">{roleTasks.length}</p>
            <p className="text-xs text-slate-500">Tasks</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
            <p className="text-lg font-semibold text-orange-300">{urgentTasks}</p>
            <p className="text-xs text-slate-500">Priority</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
            <p className="text-lg font-semibold text-red-300">{blockedTasks + openRisks}</p>
            <p className="text-xs text-slate-500">Escalations</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  index: number;
  onClick: () => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

function TaskCard({ task, index, onClick, onStatusChange }: TaskCardProps) {
  const StatusIcon = STATUS_ICONS[task.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group"
    >
      <div className={`p-4 rounded-xl border transition-all duration-200 ${STATUS_COLORS[task.status]} hover:border-cyan-500/30 hover:bg-slate-800/30`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-900/50 border border-slate-800 flex items-center justify-center">
            <StatusIcon className="w-5 h-5" style={{ color: task.status === 'completed' ? '#22c55e' : task.status === 'in-progress' ? '#06b6d4' : task.status === 'blocked' ? '#ef4444' : '#94a3b8' }} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0" onClick={onClick}>
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-slate-100 truncate pr-2">{task.title}</h4>
              <Badge variant="neutral" size="sm" className={STATUS_COLORS[task.status]}>
                {STATUS_LABELS[task.status]}
              </Badge>
            </div>
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{task.description}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" />
                Due: {new Date(task.deadline).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" aria-hidden="true" />
                {task.assignee}
              </span>
              <span className="flex items-center gap-1">
                <Flag className="w-3 h-3" aria-hidden="true" />
                {task.priority}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1">
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
              aria-label={`Change status for ${task.title}`}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Tasks() {
  const { tasks, risks, selectedRole, completeTask, openDrawer, updateTaskStatus } = useDashboardStore();
  const [statusFilter, setStatusFilter] = React.useState<TaskStatus | 'all'>('all');

  const filteredTasks = tasks.filter(task => {
    const roleMatch = selectedRole === 'leadership' || task.assignee === selectedRole;
    const statusMatch = statusFilter === 'all' || task.status === statusFilter;
    return roleMatch && statusMatch;
  });

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <Card variant="glass" padding="none" className="h-full flex flex-col">
      <CardHeader className="p-6 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle>Tasks</CardTitle>
            <Badge variant="neutral" size="sm">Demo Data</Badge>
          </div>
          <CardDescription className="mt-1 ml-0 sm:mt-0 sm:ml-2">
            {pendingCount} pending, {inProgressCount} in progress, {completedCount} completed
          </CardDescription>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'blocked', label: 'Blocked' },
            ]}
            className="w-auto min-w-[160px]"
          />
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 flex-1 overflow-y-auto">
        <RoleWorkflowSummary role={selectedRole} tasks={tasks} risks={risks} />
        <AnimatePresence mode="popLayout">
          {filteredTasks.length > 0 ? (
            <div className="space-y-3" role="list" aria-label="Tasks">
              {filteredTasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onClick={() => openDrawer(task, 'task')}
                  onStatusChange={(taskId, status) => {
                    if (status === 'completed') {
                      completeTask(taskId);
                    } else {
                      updateTaskStatus(taskId, status);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <CheckSquare className="w-12 h-12 text-slate-600 mb-4" aria-hidden="true" />
              <p className="text-slate-400">No tasks match your filters</p>
              <p className="text-sm text-slate-500 mt-1">Try adjusting the status filter</p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
