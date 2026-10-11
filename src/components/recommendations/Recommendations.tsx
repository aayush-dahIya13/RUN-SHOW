'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, Flag, Clock, User, Target, ArrowRight } from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { PRIORITY_COLORS } from '@/lib/demo-data';
import { Recommendation, RecommendationPriority } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';

const PRIORITY_LABELS: Record<RecommendationPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const PRIORITY_ICONS = {
  urgent: Flag,
  high: Flag,
  medium: Target,
  low: Lightbulb,
};

interface RecommendationCardProps {
  rec: Recommendation;
  index: number;
  onClick: () => void;
}

function RecommendationCard({ rec, index, onClick }: RecommendationCardProps) {
  const PriorityIcon = PRIORITY_ICONS[rec.priority];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group"
    >
      <button
        onClick={onClick}
        className={`w-full p-5 rounded-xl border transition-all duration-200 text-left ${PRIORITY_COLORS[rec.priority]} hover:border-cyan-500/30 hover:bg-slate-800/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-900/50 border border-slate-800 flex items-center justify-center">
            <PriorityIcon className="w-6 h-6" style={{ color: rec.priority === 'urgent' ? '#ef4444' : rec.priority === 'high' ? '#f97316' : rec.priority === 'medium' ? '#eab308' : '#06b6d4' }} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-slate-100 pr-2">{rec.action}</h4>
              <Badge variant="neutral" size="sm" className={PRIORITY_COLORS[rec.priority].replace('border-', '').replace('bg-', 'bg-').replace('text-', 'text-')}>
                {PRIORITY_LABELS[rec.priority]}
              </Badge>
            </div>
            <p className="text-sm text-slate-400 mt-2 line-clamp-2">{rec.reason}</p>
            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" />
                Due: {new Date(rec.deadline).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" aria-hidden="true" />
                {rec.owner}
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" aria-hidden="true" />
                Impact: {rec.expectedImpact}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-5 h-5 text-slate-500 hover:text-cyan-400" aria-hidden="true" />
          </div>
        </div>
      </button>
    </motion.div>
  );
}

export function Recommendations() {
  const { recommendations, selectedRole, openDrawer } = useDashboardStore();
  const [priorityFilter, setPriorityFilter] = React.useState<RecommendationPriority | 'all'>('all');

  const filteredRecs = recommendations.filter(rec => {
    const roleMatch = selectedRole === 'leadership' || rec.owner === selectedRole;
    const priorityMatch = priorityFilter === 'all' || rec.priority === priorityFilter;
    return roleMatch && priorityMatch;
  });

  const urgentCount = recommendations.filter(r => r.priority === 'urgent').length;
  const highCount = recommendations.filter(r => r.priority === 'high').length;

  return (
    <Card variant="glass" padding="none" className="h-full flex flex-col">
      <CardHeader className="p-6 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle>AI Recommendations</CardTitle>
            <Badge variant="neutral" size="sm">Demo Data</Badge>
          </div>
          <CardDescription className="mt-1 ml-0 sm:mt-0 sm:ml-2">
            {urgentCount} urgent, {highCount} high — prioritized actions based on current risks
          </CardDescription>
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as RecommendationPriority | 'all')}
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
            className="w-auto min-w-[160px]"
          />
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filteredRecs.length > 0 ? (
            <div className="space-y-3" role="list" aria-label="Recommendations">
              {filteredRecs.map((rec, index) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  index={index}
                  onClick={() => openDrawer(
                    { id: rec.id, title: rec.action, description: rec.reason, priority: rec.priority, assignee: rec.owner, deadline: rec.deadline, status: 'pending', relatedRecommendationId: rec.id },
                    'recommendation'
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
              <Lightbulb className="w-12 h-12 text-slate-600 mb-4" aria-hidden="true" />
              <p className="text-slate-400">No recommendations match your filters</p>
              <p className="text-sm text-slate-500 mt-1">Try adjusting the priority filter</p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}