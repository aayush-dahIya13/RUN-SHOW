export type RegistrationRecord = { created_at: string; status: string };

export function registrationAnalytics(input: {
  registrations: RegistrationRecord[]; target: number; capacity: number | null;
  registrationDeadline: string | null; eventStart: string; now?: Date; days: number;
}) {
  const now = input.now ?? new Date();
  const cutoff = new Date(now.getTime() - input.days * 86_400_000);
  const counts = { confirmed: 0, pending: 0, cancelled: 0, waitlisted: 0 };
  const byDay = new Map<string, number>();
  let active = 0;
  for (const registration of input.registrations) {
    const status = registration.status.toLowerCase();
    if (Object.hasOwn(counts, status)) counts[status as keyof typeof counts]++;
    if (status !== 'cancelled') active++;
    const created = new Date(registration.created_at);
    if (Number.isFinite(created.getTime()) && created >= cutoff && created <= now && status !== 'cancelled') {
      const day = created.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) || 0) + 1);
    }
  }
  const deadline = input.registrationDeadline ? new Date(input.registrationDeadline) : new Date(input.eventStart);
  const daysRemaining = Number.isFinite(deadline.getTime()) ? Math.max(0, (deadline.getTime() - now.getTime()) / 86_400_000) : null;
  const dates: string[] = [];
  for (let offset = input.days - 1; offset >= 0; offset--) {
    const date = new Date(now.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
    dates.push(date);
  }
  const series = dates.map(date => ({ date, registrations: byDay.get(date) || 0 }));
  const recent = series.slice(-7).map(item => item.registrations);
  const avgDailyRate = recent.length ? recent.reduce((sum, value) => sum + value, 0) / recent.length : 0;
  const requiredDailyRate = daysRemaining && input.target > 0 ? Math.max(0, input.target - counts.confirmed) / daysRemaining : null;
  const observedDays = input.registrations.filter(item => item.status !== 'cancelled').flatMap(item => {
    const created = new Date(item.created_at);
    return Number.isFinite(created.getTime()) ? [created.toISOString().slice(0, 10)] : [];
  });
  const enoughData = observedDays.length >= 5 && new Set(observedDays).size >= 3;
  const projected = enoughData && daysRemaining !== null ? counts.confirmed + avgDailyRate * daysRemaining : null;
  const dailyStdDev = recent.length > 1 ? Math.sqrt(recent.reduce((sum, value) => sum + (value - avgDailyRate) ** 2, 0) / (recent.length - 1)) : 0;
  const uncertainty = projected === null ? null : Math.ceil(1.28 * dailyStdDev * Math.sqrt(Math.max(1, daysRemaining || 0)));
  return {
    total: active, ...counts, target: input.target, capacity: input.capacity,
    progressPercent: input.target > 0 ? Math.min(100, Math.round(counts.confirmed / input.target * 100)) : null,
    remainingToTarget: Math.max(0, input.target - counts.confirmed), daysRemaining,
    averageDailyRate: Number(avgDailyRate.toFixed(2)), requiredDailyRate: requiredDailyRate === null ? null : Number(requiredDailyRate.toFixed(2)),
    series, forecast: { sufficientData: enoughData, estimate: projected === null ? null : Math.round(projected),
      low: projected === null ? null : Math.max(counts.confirmed, Math.floor(projected - uncertainty!)),
      high: projected === null ? null : Math.ceil(projected + uncertainty!), uncertainty: uncertainty === null ? null : `rough range ±${uncertainty} registrations; based on recent daily variability, not validated forecast accuracy` },
  };
}

export function outreachAnalytics(invitations: Array<{ id: string; code: string; campaign_name?: string | null; outreach_source?: string | null; created_at: string; registrations: number; confirmedRegistrations: number; used_count: number }>) {
  const grouped = new Map<string, { source: string; campaign: string; generated: number; attributedRegistrations: number; confirmedRegistrations: number }>();
  for (const invitation of invitations) {
    const source = invitation.outreach_source || 'Unspecified';
    const campaign = invitation.campaign_name || 'Unlabelled campaign';
    const key = `${source}\0${campaign}`;
    const value = grouped.get(key) || { source, campaign, generated: 0, attributedRegistrations: 0, confirmedRegistrations: 0 };
    value.generated++;
    value.attributedRegistrations += invitation.registrations;
    value.confirmedRegistrations += invitation.confirmedRegistrations;
    grouped.set(key, value);
  }
  return { invitationsGenerated: invitations.length,
    registrationsAttributed: invitations.reduce((sum, invitation) => sum + invitation.registrations, 0),
    confirmedRegistrationsAttributed: invitations.reduce((sum, invitation) => sum + invitation.confirmedRegistrations, 0),
    deliveryTracked: false, linkOpensTracked: false,
    sources: [...grouped.values()].map(value => ({ ...value, attributedPerGeneratedInvitation: value.generated ? Number((value.attributedRegistrations / value.generated).toFixed(2)) : 0 })) };
}
