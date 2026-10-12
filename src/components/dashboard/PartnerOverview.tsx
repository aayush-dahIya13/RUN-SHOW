'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Handshake, Building2, CheckCircle, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard-state';
import { api } from '@/lib/api';
import { Partner } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const STATUS_CONFIG: Record<'confirmed' | 'pending', { label: string; variant: 'success' | 'warning'; icon: typeof CheckCircle }> = {
  confirmed: { label: 'Confirmed', variant: 'success', icon: CheckCircle },
  pending: { label: 'Pending', variant: 'warning', icon: Clock },
};

export function PartnerOverview() {
  const { openDrawer, isUsingApi, event } = useDashboardStore();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!isUsingApi || !event.id || event.id === 'no-selected-event') {
        setPartners([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await api.getPartners(event.id);
        setPartners(data);
      } catch (e) {
        console.error('Failed to load partners:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [event.id, isUsingApi]);

  const confirmedCount = partners.filter(p => p.status === 'confirmed').length;
  const pendingCount = partners.filter(p => p.status === 'pending').length;

  if (loading) {
    return (
      <Card variant="glass" padding="md" className="h-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--action-primary)]" aria-label="Loading partners" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card variant="glass" padding="none" className="h-full">
        <CardHeader className="p-6 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--action-primary)]">
                <Handshake className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Partner Confirmations</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span>Partner confirmations for this event</span>
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="success" dot>{confirmedCount} confirmed</Badge>
              <Badge variant="warning" dot>{pendingCount} pending</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((partner, index) => (
              <motion.div
                key={partner.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] hover:border-[var(--action-primary)]/40 hover:bg-[var(--surface-elevated)] transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)]">{partner.name}</h4>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{partner.type} Partner</p>
                  </div>
                  <Badge variant={STATUS_CONFIG[partner.status].variant} size="sm" dot>
                    {STATUS_CONFIG[partner.status].label}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span>Contact: <span className="text-[var(--text-primary)] font-medium">{partner.contact}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span>Decision by: <span className="text-[var(--text-primary)] font-medium">{new Date(partner.deadline).toLocaleDateString()}</span></span>
                  </div>
                </div>
                {partner.status === 'pending' && (
                  <div className="mt-3 p-3 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent)]/30">
                    <div className="flex items-center gap-2 text-xs text-[var(--danger)] mb-2">
                      <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                      <span>Action required: Follow up needed</span>
                    </div>
                    <motion.button
                      onClick={() => openDrawer(
                        { id: partner.id, title: `Follow up: ${partner.name}`, description: `Contact ${partner.contact} to confirm partnership.`, priority: 'high', assignee: 'partnerships', deadline: partner.deadline, status: 'pending', relatedRecommendationId: 'rec-3' },
                        'task'
                      )}
                      className="text-xs font-medium text-[var(--action-primary)] hover:text-[var(--action-primary-hover)] flex items-center gap-1"
                    >
                      Create follow-up task
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </motion.button>
                  </div>
                )}
              </motion.div>
            ))}
            {!partners.length && <p className="col-span-full rounded-md border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-secondary)]">No partner records are available for this event.</p>}
          </div>
        </CardContent>
      </Card>

      <Card variant="glass" padding="md">
        <CardContent className="flex flex-col items-center text-center py-2">
          <p className="text-sm text-[var(--text-secondary)] mb-2">Partner management dashboard</p>
          <p className="text-xs text-[var(--text-muted)]">Full partner CRM, contract tracking, and deliverables management will be implemented by Member 2</p>
        </CardContent>
      </Card>
    </div>
  );
}
