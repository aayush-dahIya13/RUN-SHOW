'use client';

import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { SEVERITY_COLORS, RISK_STATUS_COLORS } from '@/lib/demo-data';
import { Risk, RiskSeverity, RiskStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const SEVERITY_LABELS: Record<RiskSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const STATUS_LABELS: Record<RiskStatus, string> = {
  open: 'Open',
  'in-progress': 'In Progress',
  mitigated: 'Mitigated',
  closed: 'Closed',
};

interface RiskSummaryCardProps {
  risk: Risk;
  index: number;
}

function RiskSummaryCard({ risk, index }: RiskSummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <div className={`p-4 rounded-xl border ${SEVERITY_COLORS[risk.severity]} hover:border-[var(--action-primary)]/40 hover:bg-[var(--surface-elevated)] transition-all duration-200`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[var(--danger)]" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-[var(--text-primary)] truncate pr-2">{risk.title}</h4>
              <Badge variant="neutral" size="sm" className={SEVERITY_COLORS[risk.severity].replace('border-', '').replace('bg-', 'bg-').replace('text-', 'text-')}>
                {SEVERITY_LABELS[risk.severity]}
              </Badge>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-1">{risk.reason}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" />
                {risk.deadline ? `Due: ${new Date(risk.deadline).toLocaleDateString()}` : 'No deadline'}
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="neutral" size="sm" className={RISK_STATUS_COLORS[risk.status]}>
                  {STATUS_LABELS[risk.status]}
                </Badge>
              </span>
              <span className="flex items-center gap-1">Owner: {risk.owner}</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" aria-hidden="true" />
        </div>
      </div>
    </motion.div>
  );
}

export function CriticalRisksSummary() {
  const { risks, selectedRole, event } = useDashboardStore();

  const criticalRisks = risks
    .filter(r => r.severity === 'critical' || r.severity === 'high')
    .filter(r => !r.eventId || r.eventId === event.id)
    .filter(r => selectedRole === 'leadership' || r.owner === selectedRole)
    .slice(0, 3);

  if (criticalRisks.length === 0) {
    return (
      <Card variant="glass" padding="md" className="max-w-sm">
        <CardContent className="flex flex-col items-center text-center py-4">
          <AlertTriangle className="w-12 h-12 text-[var(--action-primary)]/60 mb-2" aria-hidden="true" />
          <p className="text-sm text-[var(--text-secondary)]">No critical or high risks</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">All risks are medium or low severity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" padding="none" className="h-full">
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Critical Risks</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Top risks requiring immediate attention</p>
          </div>
          <Badge variant="danger" size="sm" dot>
            {criticalRisks.length} active
          </Badge>
        </div>
      </div>
      <CardContent className="p-6 pt-0">
        <div className="space-y-2" role="list" aria-label="Critical risks">
          {criticalRisks.map((risk, index) => (
            <RiskSummaryCard
              key={risk.id}
              risk={risk}
              index={index}
            />
          ))}
        </div>
        {criticalRisks.length >= 3 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => useDashboardStore.getState().setSelectedView('operations')}
            className="w-full mt-3 text-sm font-medium text-[var(--action-primary)] hover:text-[var(--action-primary-hover)] flex items-center justify-center gap-1 p-2 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
          >
            View all risks in Operations
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </motion.button>
        )}
      </CardContent>
    </Card>
  );
}
