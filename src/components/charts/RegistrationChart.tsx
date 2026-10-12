'use client';

import { motion } from 'motion/react';
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useDashboardStore } from '@/lib/dashboard-state';
import { DEMO_CHART_DATA, DEMO_OUTREACH_DATA } from '@/lib/demo-data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const COLORS = {
  primary: 'var(--action-primary)',
  target: 'var(--text-secondary)',
  targetLine: 'var(--text-secondary)',
  grid: 'var(--divider)',
  text: 'var(--text-secondary)',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; dataKey: string; color: string }>;
  label?: string;
}

function RegistrationTooltip({ active, payload, label }: CustomTooltipProps) {
  const { event } = useDashboardStore();
  const chartData = DEMO_CHART_DATA.map(d => ({
    ...d,
    projected: d.registrations + Math.round((event.targetRegistrations - d.registrations) * 0.3),
  }));

  if (!active || !payload?.length || !label) return null;
  const dataPoint = chartData.find(d => d.date === label);
  if (!dataPoint) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg p-3 shadow-xl min-w-[180px]"
    >
      <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--action-primary)]" />
          <span className="text-[var(--text-secondary)]">Actual: <span className="font-mono text-[var(--text-primary)]">{dataPoint.registrations}</span></span>
        </div>
        {dataPoint.target && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
            <span className="text-[var(--text-secondary)]">Target: <span className="font-mono text-[var(--text-primary)]">{dataPoint.target}</span></span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          <span className="text-[var(--text-secondary)]">Projected: <span className="font-mono text-[var(--text-primary)]">{dataPoint.projected}</span></span>
        </div>
      </div>
    </motion.div>
  );
}

function OutreachTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null;
  const dataPoint = DEMO_OUTREACH_DATA.find(d => d.channel === label);
  if (!dataPoint) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg p-3 shadow-xl min-w-[200px]"
    >
      <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--action-primary)]" />
          <span className="text-[var(--text-secondary)]">Sent: <span className="font-mono text-[var(--text-primary)]">{dataPoint.sent.toLocaleString()}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--action-primary)]" />
          <span className="text-[var(--text-secondary)]">Converted: <span className="font-mono text-[var(--text-primary)]">{dataPoint.converted}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          <span className="text-[var(--text-secondary)]">Rate: <span className="font-mono text-[var(--text-primary)]">{dataPoint.conversionRate}%</span></span>
        </div>
      </div>
    </motion.div>
  );
}

export function RegistrationTrendChart() {
  const { event } = useDashboardStore();
  const chartData = DEMO_CHART_DATA.map(d => ({
    ...d,
    projected: d.registrations + Math.round((event.targetRegistrations - d.registrations) * 0.3),
  }));

  return (
    <Card variant="glass" padding="none" className="h-full">
      <CardHeader className="p-6 pb-0">
        <CardTitle>Registration Trend</CardTitle>
        <CardDescription className="flex items-center gap-2 mt-1">
          <Badge variant="neutral" size="sm">Demo Data</Badge>
          <span>Illustrative demo trend; figures are not event-specific</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke={COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                stroke={COLORS.text}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.split(' ')[1] || value}
              />
              <YAxis
                stroke={COLORS.text}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
                domain={[0, 'dataMax + 50']}
              />
              <Tooltip content={<RegistrationTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => (
                  <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                    {value === 'registrations' && <span className="w-2 h-2 rounded-full bg-[var(--action-primary)]" />}
                    {value === 'target' && <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />}
                    {value === 'projected' && <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                    {value}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="registrations"
                stroke={COLORS.primary}
                fill={COLORS.primary}
                fillOpacity={0.15}
                strokeWidth={2}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke={COLORS.targetLine}
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeOpacity={0.6}
                dot={false}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="projected"
                stroke={COLORS.primary}
                strokeWidth={2}
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                dot={false}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-[var(--divider)]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--action-primary)]" />
            <span className="text-sm text-[var(--text-secondary)]">Actual registrations</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-1 bg-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-secondary)]">Target trajectory</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-1 border-t border-[var(--accent)] border-dotted" />
            <span className="text-sm text-[var(--text-secondary)]">Projected (current pace)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OutreachConversionChart() {
  return (
    <Card variant="glass" padding="none" className="h-full">
      <CardHeader className="p-6 pb-0">
        <CardTitle>Outreach Conversion</CardTitle>
        <CardDescription className="flex items-center gap-2 mt-1">
          <Badge variant="neutral" size="sm">Demo Data</Badge>
          <span>Channel performance for current campaign</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DEMO_OUTREACH_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke={COLORS.grid} horizontal={false} vertical={true} />
              <XAxis
                type="category"
                dataKey="channel"
                stroke={COLORS.text}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '…' : value}
                interval={0}
              />
              <YAxis
                stroke={COLORS.text}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
              />
              <Tooltip content={<OutreachTooltip />} />
              <Bar dataKey="converted" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={40}>
                {DEMO_OUTREACH_DATA.map((_, index) => (
                  <Cell key={`cell-${index}`} fillOpacity={0.8} />
                ))}
              </Bar>
              <Bar dataKey="sent" fill="transparent" stroke={COLORS.targetLine} strokeWidth={1} strokeDasharray="4 4" barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-[var(--divider)]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[var(--action-primary)]/80" />
            <span className="text-sm text-[var(--text-secondary)]">Converted</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-1 border-t border-[var(--text-muted)] border-dotted" />
            <span className="text-sm text-[var(--text-secondary)]">Total sent (outline)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
