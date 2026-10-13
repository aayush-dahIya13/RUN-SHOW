'use client';

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, CheckCircle, Clock, User, Flag, AlertTriangle, Target, ArrowRight } from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { Task, DrawerState } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PRIORITY_COLORS, STATUS_COLORS } from '@/lib/demo-data';

const PRIORITY_LABELS: Record<Task['priority'], string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const STATUS_LABELS: Record<Task['status'], string> = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
};

interface TaskDrawerProps {
  state: DrawerState;
  onClose: () => void;
}

export function TaskDrawerContent({ state, onClose }: TaskDrawerProps) {
  const { completeTask } = useDashboardStore();
  const reduceMotion = useReducedMotion();

  if (!state.task) return null;

  const task = state.task;
  const isCompleted = task.status === 'completed';

  const handleComplete = () => {
    completeTask(task.id);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
      {state.isOpen && <>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          className="fixed inset-0 z-50 bg-[var(--metallic-black)]/50"
          onClick={onClose}
          aria-hidden="true"
        />
        <motion.aside
        initial={reduceMotion ? false : { x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
        className="fixed right-0 top-0 z-50 h-dvh w-full max-w-2xl bg-[var(--surface-card)] border-l border-[var(--border)] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex items-start justify-between gap-3 p-4 sm:p-6 border-b border-[var(--divider)]">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{state.type}</span>
              <Badge variant="neutral" size="sm" className={PRIORITY_COLORS[task.priority]}>
                {PRIORITY_LABELS[task.priority]}
              </Badge>
            </div>
            <h2 id="drawer-title" className="text-xl font-bold text-[var(--text-primary)]">{task.title}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Description</h3>
            <p className="text-[var(--text-secondary)] leading-relaxed">{task.description}</p>
          </div>

          {task.comments?.length ? <section className="space-y-3" aria-label="Task progress history">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">Progress updates</h3>
            {task.comments.map(comment => <article key={comment.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
              <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{comment.content}</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{comment.userName} · {new Date(comment.createdAt).toLocaleString()}</p>
            </article>)}
          </section> : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Assignee</label>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--text-secondary)]" aria-hidden="true" />
                <span className="text-[var(--text-primary)] font-medium">{task.assignee}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Deadline</label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--text-secondary)]" aria-hidden="true" />
                <span className="text-[var(--text-primary)] font-medium">{new Date(task.deadline).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Status</label>
              <div className="flex items-center gap-2">
                <Badge variant="neutral" size="sm" className={STATUS_COLORS[task.status]}>
                  {STATUS_LABELS[task.status]}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Priority</label>
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-[var(--text-secondary)]" aria-hidden="true" />
                <Badge variant="neutral" size="sm" className={PRIORITY_COLORS[task.priority]}>
                  {PRIORITY_LABELS[task.priority]}
                </Badge>
              </div>
            </div>
          </div>

          {task.relatedRiskId && (
            <div className="space-y-2 p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)]">
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Related Risk</label>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-[var(--danger)]" aria-hidden="true" />
                <div>
                  <p className="text-[var(--text-primary)] font-medium">{task.relatedRiskId}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Click to view risk details</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] ml-auto" aria-hidden="true" />
              </div>
            </div>
          )}

          {task.relatedRecommendationId && (
            <div className="space-y-2 p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)]">
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Related Recommendation</label>
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-[var(--action-primary)]" aria-hidden="true" />
                <div>
                  <p className="text-[var(--text-primary)] font-medium">{task.relatedRecommendationId}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Click to view recommendation</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] ml-auto" aria-hidden="true" />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[var(--divider)]">
            {state.type === 'risk' ? (
              <Button variant="secondary" className="w-full" onClick={onClose}>
                Back to Risk Centre
              </Button>
            ) : isCompleted ? (
              <div className="flex items-center justify-center gap-2 text-[var(--action-primary)] p-4 rounded-lg bg-[var(--success-surface)] border border-[var(--action-primary)]/30">
                <CheckCircle className="w-5 h-5" aria-hidden="true" />
                <span className="font-medium">Task completed</span>
              </div>
            ) : (
              <Button variant="primary" className="w-full" onClick={handleComplete}>
                <CheckCircle className="w-5 h-5" aria-hidden="true" />
                Mark as Complete
              </Button>
            )}
          </div>
        </div>
      </motion.aside>
      </>}
    </AnimatePresence>
  </>
  );
}
