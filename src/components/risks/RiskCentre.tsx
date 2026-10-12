'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Clock, Filter, ExternalLink } from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { SEVERITY_COLORS, RISK_STATUS_COLORS } from '@/lib/demo-data';
import { Risk, RiskSeverity, RiskStatus } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';

const SEVERITY_ICONS = {
  critical: AlertTriangle,
  high: AlertTriangle,
  medium: AlertTriangle,
  low: AlertTriangle,
};

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

interface RiskCardProps {
  risk: Risk;
  index: number;
  onClick: () => void;
}

function RiskCard({ risk, index, onClick }: RiskCardProps) {
  const SeverityIcon = SEVERITY_ICONS[risk.severity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group"
    >
      <button
        onClick={onClick}
        className={`w-full p-4 rounded-xl border transition-all duration-200 text-left ${
          SEVERITY_COLORS[risk.severity]
        } hover:border-[var(--action-primary)]/40 hover:bg-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]`}
        aria-pressed="false"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center">
            <SeverityIcon className="w-5 h-5 text-[var(--danger)]" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-[var(--text-primary)] truncate pr-2">{risk.title}</h4>
              <Badge variant="neutral" size="sm" className={SEVERITY_COLORS[risk.severity].replace('border-', '').replace('bg-', 'bg-').replace('text-', 'text-')}>
                {SEVERITY_LABELS[risk.severity]}
              </Badge>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{risk.reason}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" />
                {risk.deadline ? `Due: ${new Date(risk.deadline).toLocaleDateString()}` : 'No deadline'}
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="neutral" size="sm" className={RISK_STATUS_COLORS[risk.status]}>
                  {STATUS_LABELS[risk.status]}
                </Badge>
              </span>
              <span className="flex items-center gap-1">
                Owner: {risk.owner}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="w-5 h-5 text-[var(--text-muted)] hover:text-[var(--action-primary)]" aria-hidden="true" />
          </div>
        </div>
      </button>
    </motion.div>
  );
}

export function RiskCentre() {
  const { risks, selectedRole, openDrawer, event } = useDashboardStore();
  const [severityFilter, setSeverityFilter] = React.useState<RiskSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = React.useState<RiskStatus | 'all'>('all');

  const filteredRisks = risks.filter(risk => {
    const roleMatch = selectedRole === 'leadership' || risk.owner === selectedRole;
    const severityMatch = severityFilter === 'all' || risk.severity === severityFilter;
    const statusMatch = statusFilter === 'all' || risk.status === statusFilter;
    return roleMatch && severityMatch && statusMatch && (!risk.eventId || risk.eventId === event.id);
  });

  const eventRisks = risks.filter(risk => !risk.eventId || risk.eventId === event.id);
  const criticalCount = eventRisks.filter(r => r.severity === 'critical').length;
  const highCount = eventRisks.filter(r => r.severity === 'high').length;

  return (
    <Card variant="glass" padding="none" className="h-full flex flex-col">
      <CardHeader className="p-6 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle>Risk Centre</CardTitle>
          </div>
          <CardDescription className="mt-1 ml-0 sm:mt-0 sm:ml-2">
            {criticalCount} critical, {highCount} high — prioritized by severity and ownership
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as RiskSeverity | 'all')}
              options={[
                { value: 'all', label: 'All Severities' },
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
              className="w-auto min-w-[160px]"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RiskStatus | 'all')}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'open', label: 'Open' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'mitigated', label: 'Mitigated' },
                { value: 'closed', label: 'Closed' },
              ]}
              className="w-auto min-w-[160px]"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 flex-1">
        <AnimatePresence mode="popLayout">
          {filteredRisks.length > 0 ? (
            <div className="space-y-3" role="list" aria-label="Risks">
              {filteredRisks.map((risk, index) => (
                <RiskCard
                  key={risk.id}
                  risk={risk}
                  index={index}
                  onClick={() => openDrawer(
                    { id: risk.id, title: risk.title, description: risk.reason, priority: risk.severity === 'critical' ? 'urgent' : risk.severity === 'high' ? 'high' : 'medium', assignee: risk.owner, deadline: risk.deadline || '', status: risk.status === 'mitigated' ? 'completed' : risk.status === 'in-progress' ? 'in-progress' : 'pending', relatedRiskId: risk.id },
                    'risk'
                  )}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <Filter className="w-12 h-12 text-[var(--text-muted)] mb-4" aria-hidden="true" />
              <p className="text-[var(--text-secondary)]">No risks match your filters</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Try adjusting the severity or status filters</p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
