'use client';

import { motion } from 'motion/react';
import { Users, Target, Handshake, Flag, AlertCircle } from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  variant?: 'default' | 'warning' | 'danger' | 'success';
  delay?: number;
  simulated?: boolean;
  simulatedLabel?: string;
}

function KPICard({ title, value, subtitle, icon, trend, variant = 'default', delay = 0, simulated = false, simulatedLabel }: KPICardProps) {
  const variantColors = {
    default: 'border-[var(--border)]',
    warning: 'border-[var(--accent)]/30',
    danger: 'border-[var(--danger)]/30',
    success: 'border-[var(--action-primary)]/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card variant="glass" padding="md" hover className={variantColors[variant]}>
        <CardContent className="flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--action-primary)]">
              {icon}
            </div>
            <div className="flex items-center gap-1.5">
              {trend && (
                <Badge variant={trend.value >= 0 ? 'success' : 'danger'} size="sm" className="self-start">
                  {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
                </Badge>
              )}
              {simulated && (
                <Badge variant="warning" size="sm" className="self-start" aria-label={simulatedLabel || 'Includes simulated outcomes'}>
                  <AlertCircle className="w-2.5 h-2.5" aria-hidden="true" />
                  <span className="text-xs">Sim</span>
                </Badge>
              )}
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-between min-h-[80px]">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">{title}</p>
              <motion.span
                className="text-3xl font-bold text-[var(--text-primary)] tabular-nums"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: delay * 0.1 + 0.1 }}
              >
                {value}
              </motion.span>
            </div>
            {subtitle && (
              <p className="text-xs text-[var(--text-muted)] mt-2">{subtitle}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function KPICards() {
  const { kpis, event, isUsingApi } = useDashboardStore();
  const regGap = event.targetRegistrations - event.currentRegistrations;
  const regPercentage = Math.round((event.currentRegistrations / event.targetRegistrations) * 100);
  const hasSimulatedOutcomes = event.currentRegistrations > 280 && !isUsingApi;

  const cards: (KPICardProps & { delay: number })[] = [
    {
      title: 'Registrations',
      value: `${event.currentRegistrations} / ${event.targetRegistrations}`,
      subtitle: `${regPercentage}% of target • ${regGap} remaining`,
      icon: <Users className="w-5 h-5" aria-hidden="true" />,
      trend: { value: 12, label: 'vs last week' },
      variant: regPercentage < 60 ? 'danger' : regPercentage < 80 ? 'warning' : 'success',
      delay: 0,
      simulated: hasSimulatedOutcomes,
      simulatedLabel: 'Includes simulated task outcomes (task-1: +50, task-6: +25)',
    },
    {
      title: 'Registration Gap',
      value: regGap,
      subtitle: 'Attendees needed to hit target',
      icon: <Target className="w-5 h-5" aria-hidden="true" />,
      trend: { value: -8, label: 'vs yesterday' },
      variant: regPercentage < 60 || event.daysRemaining <= 3 ? 'danger' : 'warning',
      delay: 1,
    },
    {
      title: 'Partner Confirmations',
      value: `${kpis.partnerConfirmations.current} / ${kpis.partnerConfirmations.total}`,
      subtitle: `${kpis.partnerConfirmations.percentage}% confirmed`,
      icon: <Handshake className="w-5 h-5" aria-hidden="true" />,
      trend: { value: 0, label: 'unchanged' },
      variant: kpis.partnerConfirmations.percentage < 80 ? 'warning' : 'success',
      delay: 2,
    },
    {
      title: 'Task Completion',
      value: `${kpis.taskCompletion.percentage}%`,
      subtitle: `${kpis.taskCompletion.completed} of ${kpis.taskCompletion.total} tasks done`,
      icon: <Flag className="w-5 h-5" aria-hidden="true" />,
      trend: { value: 15, label: 'vs yesterday' },
      variant: kpis.taskCompletion.percentage < 50 ? 'danger' : kpis.taskCompletion.percentage < 80 ? 'warning' : 'success',
      delay: 3,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Key Performance Indicators">
      {cards.map((card, index) => (
        <KPICard key={card.title} {...card} delay={index} />
      ))}
      {hasSimulatedOutcomes && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="col-span-full p-3 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent)]/30 flex items-center gap-2 text-sm text-[var(--danger)]"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs">
            <strong>Simulated data:</strong> Registration count includes simulated outcomes from completed tasks (task-1: +50, task-6: +25).
            Enable <code className="px-1.5 py-0.5 bg-[var(--surface-elevated)] rounded text-[var(--action-primary)] font-mono text-xs">NEXT_PUBLIC_USE_API=true</code> to use live backend data.
          </span>
        </motion.div>
      )}
    </div>
  );
}

export function EventReadinessIndicator() {
  const { kpis } = useDashboardStore();

  return (
    <Card variant="glass" padding="md" className="max-w-sm">
      <CardContent className="flex flex-col items-center text-center py-2">
        <div className="relative mb-4">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className="text-[var(--action-primary)]"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: kpis.eventReadiness / 100 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{
                strokeDasharray: 283,
                strokeDashoffset: 283 * (1 - kpis.eventReadiness / 100),
                stroke: kpis.eventReadiness >= 80 ? 'var(--action-primary)' : 'var(--accent)',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              className="text-4xl font-bold text-[var(--text-primary)] tabular-nums"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {kpis.eventReadiness}%
            </motion.span>
          </div>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-1">Event Readiness</p>
        <p className="text-xs text-[var(--text-muted)]">
          Weighted score: registrations, partners, tasks, venue
        </p>
      </CardContent>
    </Card>
  );
}
