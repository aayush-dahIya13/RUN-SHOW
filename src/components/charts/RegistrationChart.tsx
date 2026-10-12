'use client';

import { BarChart3, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export function RegistrationTrendChart() {
  return <EmptyChart title="Registration Trend" icon={TrendingUp} message="Registration history is not available for this event yet." />;
}

export function OutreachConversionChart() {
  return <EmptyChart title="Outreach Conversion" icon={BarChart3} message="Campaign performance will appear here when recorded." />;
}

function EmptyChart({ title, message, icon: Icon }: { title: string; message: string; icon: typeof TrendingUp }) {
  return <Card variant="glass" padding="none" className="min-h-72">
    <CardHeader className="p-6 pb-0"><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
      <Icon className="h-8 w-8 text-[var(--text-muted)]" aria-hidden="true" />
      <p className="mt-3 max-w-sm text-sm text-[var(--text-secondary)]">{message}</p>
    </CardContent>
  </Card>;
}
