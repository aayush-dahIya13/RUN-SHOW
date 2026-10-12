import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';
import { EventMilestone, EventPlan, EventSetupFormData, Recommendation, Risk, Task } from './types';

function clampDate(date: Date, min: Date, max: Date): string {
  const time = Math.min(Math.max(date.getTime(), min.getTime()), max.getTime());
  return format(new Date(time), 'yyyy-MM-dd');
}

function deadlineBefore(eventDate: Date, daysBefore: number, earliest: Date): string {
  return clampDate(subDays(eventDate, daysBefore), earliest, eventDate);
}

function splitLines(value: string): string[] {
  return value
    .split(/\n|,/)
    .map(item => item.trim())
    .filter(Boolean);
}

function priorityFor(daysRemaining: number, index: number): Task['priority'] {
  if (daysRemaining <= 7 || index < 3) return 'urgent';
  if (daysRemaining <= 21 || index < 7) return 'high';
  if (index < 11) return 'medium';
  return 'low';
}

export function getDefaultEventSetupForm(): EventSetupFormData {
  const timezone = typeof Intl === 'undefined' ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return {
    name: '',
    type: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    timezone,
    registrationDeadline: '',
    partnerDeadline: '',
    contentDeadline: '',
    audience: '',
    targetRegistrations: 300,
    currentRegistrations: 0,
    venue: '',
    format: 'in-person',
    meetingUrl: '',
    joiningInstructions: '',
    objectives: '',
    successMetrics: '',
    budget: undefined,
    operationalRequirements: '',
    expectedPartners: 0,
    sessions: [],
    participantCapacity: undefined,
    expectedAttendance: 0,
  };
}

export function generateEventPlan(form: EventSetupFormData): EventPlan {
  const today = new Date();
  const startDate = parseISO(form.startDate);
  const endDate = parseISO(form.endDate);
  const daysRemaining = Math.max(0, differenceInCalendarDays(startDate, today));
  const eventSlug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'event';
  const scale = form.targetRegistrations >= 800 ? 'large' : form.targetRegistrations >= 300 ? 'mid' : 'focused';
  const objectives = splitLines(form.objectives);
  const successMetrics = splitLines(form.successMetrics);
  const confirmedPartners = 0;

  const milestones: EventMilestone[] = [
    {
      id: `${eventSlug}-milestone-1`,
      title: 'Event strategy locked',
      description: `Confirm the ${form.type.toLowerCase()} positioning, audience promise, success metrics, and operating rhythm.`,
      owner: 'leadership',
      deadline: deadlineBefore(startDate, Math.max(14, Math.floor(daysRemaining * 0.65)), today),
      priority: priorityFor(daysRemaining, 0),
    },
    {
      id: `${eventSlug}-milestone-2`,
      title: 'Registration engine live',
      description: `Launch outreach with a weekly target pace toward ${form.targetRegistrations.toLocaleString()} registrations.`,
      owner: 'marketing',
      deadline: form.registrationDeadline,
      priority: priorityFor(daysRemaining, 1),
    },
    {
      id: `${eventSlug}-milestone-3`,
      title: 'Partner commitments secured',
      description: `Close sponsor and community partner confirmations for ${scale}-scale delivery.`,
      owner: 'partnerships' as const,
      deadline: form.partnerDeadline,
      priority: priorityFor(daysRemaining, 2),
    },
    {
      id: `${eventSlug}-milestone-4`,
      title: 'Venue and logistics ready',
      description: `Finalize ${form.format} delivery requirements, check-in, equipment, catering, and contingency owners.`,
      owner: 'operations',
      deadline: deadlineBefore(startDate, 5, today),
      priority: priorityFor(daysRemaining, 3),
    },
    {
      id: `${eventSlug}-milestone-5`,
      title: 'Programme run-of-show approved',
      description: 'Confirm speaker flow, mentor availability, session timings, briefs, and backup coverage.',
      owner: 'programme',
      deadline: form.contentDeadline,
      priority: priorityFor(daysRemaining, 4),
    },
  ];

  const taskTemplates: Omit<Task, 'id' | 'priority' | 'status'>[] = [
    {
      title: 'Publish registration page and conversion tracking',
      description: `Set up the ${form.name} registration journey, UTM links, confirmation emails, and target pacing dashboard.`,
      assignee: 'marketing',
      deadline: form.registrationDeadline,
    },
    {
      title: 'Launch audience outreach campaign',
      description: `Create email, social, and community posts for ${form.audience || 'the target audience'} with a weekly registration goal.`,
      assignee: 'marketing',
      deadline: deadlineBefore(startDate, 12, today),
    },
    {
      title: 'Prepare content calendar and reminder sequence',
      description: 'Schedule announcement posts, speaker reveals, deadline reminders, and final attendance nudges.',
      assignee: 'marketing',
      deadline: form.contentDeadline,
    },
    ...(form.expectedPartners > 0 ? [
      {
        title: 'Build partner prospect and follow-up tracker',
        description: `Map ${form.expectedPartners} target partners, owner assignments, value proposition, next steps, and closure dates.`,
        assignee: 'partnerships' as const,
        deadline: form.partnerDeadline,
      },
      {
        title: 'Confirm partner deliverables and brand assets',
        description: 'Collect logos, booth requirements, speaking slots, benefit commitments, and status notes.',
        assignee: 'partnerships' as const,
        deadline: deadlineBefore(startDate, 8, today),
      },
    ] : []),
    {
      title: form.format === 'virtual' ? 'Finalize online platform and delivery checklist' : 'Finalize venue and delivery checklist',
      description: form.format === 'virtual'
        ? `Confirm ${form.meetingUrl || 'the online platform'}, host access, moderation, accessibility, backup links, and attendee support.`
        : `Confirm ${form.venue}, room layout, accessibility, equipment, signage, and attendee flow.${form.format === 'hybrid' ? ' Include livestream and platform checks.' : ''}`,
      assignee: 'operations',
      deadline: deadlineBefore(startDate, 7, today),
    },
    ...(form.format !== 'virtual' ? [{
      title: 'Lock catering, equipment, and staffing plan',
      description: 'Finalize catering counts, equipment owners, volunteer shifts, check-in desks, AV support, and escalation contacts.',
      assignee: 'operations' as const,
      deadline: deadlineBefore(startDate, 4, today),
    }] : []),
    {
      title: 'Create runbook and incident response path',
      description: `Document day-of command centre roles, decision thresholds, vendor contacts, and backup plans. ${form.operationalRequirements}`,
      assignee: 'operations',
      deadline: deadlineBefore(startDate, 3, today),
    },
    ...(form.sessions?.length || /conference|workshop|training|hackathon/i.test(form.type) ? [
      {
        title: 'Confirm speakers, mentors, and session owners',
        description: 'Collect bios, session titles, availability, briefing needs, and backup coverage.',
        assignee: 'programme' as const,
        deadline: form.contentDeadline,
      },
      {
        title: 'Build programme schedule and briefing pack',
        description: 'Create run-of-show, session timings, moderation notes, and attendee content.',
        assignee: 'programme' as const,
        deadline: deadlineBefore(startDate, 5, today),
      },
    ] : []),
    {
      title: 'Review readiness metrics and critical risks',
      description: `Review ${objectives[0] || 'event objectives'}, registration gap, partner status, logistics blockers, and owner escalations.`,
      assignee: 'leadership',
      deadline: deadlineBefore(startDate, 2, today),
    },
    {
      title: 'Approve final event go/no-go checklist',
      description: `Validate readiness for ${format(startDate, 'MMM d')}${endDate > startDate ? `-${format(endDate, 'MMM d')}` : ''}, including communications, support, and contingencies.`,
      assignee: 'leadership',
      deadline: deadlineBefore(startDate, 1, today),
    },
  ];

  const tasks: Task[] = taskTemplates.map((task, index) => ({
    ...task,
    id: `${eventSlug}-task-${index + 1}`,
    priority: priorityFor(daysRemaining, index),
    status: index < 2 && daysRemaining <= 10 ? 'in-progress' : 'pending',
  }));
  const firstTaskFor = (assignee: Task['assignee']) => tasks.find(task => task.assignee === assignee)?.id;

  const risks: Risk[] = [
    {
      id: `${eventSlug}-risk-registration-gap`,
      title: 'Registration Pace Risk',
      severity: form.currentRegistrations < form.targetRegistrations * 0.4 ? 'high' : 'medium',
      reason: `${form.currentRegistrations.toLocaleString()} of ${form.targetRegistrations.toLocaleString()} target registrations captured. Marketing needs pacing visibility before ${form.registrationDeadline}.`,
      owner: 'marketing',
      deadline: form.registrationDeadline,
      status: 'open' as const,
      relatedTaskId: firstTaskFor('marketing'),
    },
    ...(form.expectedPartners > 0 ? ([{
      id: `${eventSlug}-risk-partner-commitments`,
      title: 'Partner Confirmation Risk',
      severity: confirmedPartners < form.expectedPartners ? 'medium' as const : 'low' as const,
      reason: `${confirmedPartners} of ${form.expectedPartners} expected partners are confirmed at setup. Follow-ups must be tracked.`,
      owner: 'partnerships' as const,
      deadline: form.partnerDeadline,
      status: 'open' as const,
      relatedTaskId: firstTaskFor('partnerships'),
    }] satisfies Risk[]) : []),
    {
      id: `${eventSlug}-risk-logistics-readiness`,
      title: 'Logistics Readiness Risk',
      severity: form.format === 'hybrid' ? 'high' : 'medium',
      reason: `${form.format} delivery adds venue, platform, equipment, and staffing dependencies that need checkpoint owners.`,
      owner: 'operations' as const,
      deadline: deadlineBefore(startDate, 5, today),
      status: 'open' as const,
      relatedTaskId: firstTaskFor('operations'),
    },
    {
      id: `${eventSlug}-risk-programme-coverage`,
      title: 'Programme Coverage Risk',
      severity: daysRemaining <= 14 ? 'high' : 'medium',
      reason: 'Speakers, mentors, backup coverage, and final schedule must be confirmed before attendee communications lock.',
      owner: 'programme' as const,
      deadline: form.contentDeadline,
      status: 'open' as const,
      relatedTaskId: firstTaskFor('programme'),
    },
  ];

  const outreachTargets = [
    { channel: 'Email and waitlist', target: Math.ceil(form.targetRegistrations * 0.35), owner: 'marketing' as const },
    { channel: 'Community partners', target: Math.ceil(form.targetRegistrations * 0.25), owner: 'partnerships' as const },
    { channel: 'Social and creator posts', target: Math.ceil(form.targetRegistrations * 0.2), owner: 'marketing' as const },
    { channel: 'Direct institutional outreach', target: Math.ceil(form.targetRegistrations * 0.2), owner: 'leadership' as const },
  ];

  return {
    id: `${eventSlug}-plan-${Date.now()}`,
    eventDraft: form,
    milestones,
    tasks,
    risks,
    successMetrics: successMetrics.length > 0 ? successMetrics : [
      `${form.targetRegistrations.toLocaleString()} target registrations`,
      `${Math.max(80, Math.round(form.targetRegistrations * 0.75))}% attendance readiness`,
      `${form.expectedPartners} partner confirmations`,
      'Critical operational risks owned before event day',
    ],
    outreachTargets,
    generatedAt: new Date().toISOString(),
    generator: 'deterministic',
  };
}

export function recommendationsFromPlan(plan: EventPlan): Recommendation[] {
  return plan.tasks.slice(0, 8).map((task, index) => ({
    id: `${plan.id}-rec-${index + 1}`,
    action: task.title,
    reason: task.description,
    priority: task.priority,
    owner: task.assignee,
    deadline: task.deadline,
    expectedImpact: index < 3 ? 'Directly improves event readiness' : 'Reduces execution risk',
    relatedTaskId: task.id,
  }));
}
