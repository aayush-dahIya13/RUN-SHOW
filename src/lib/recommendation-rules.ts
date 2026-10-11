import { Event, Risk, Recommendation, Task, Role } from './types';

export interface RecommendationRule {
  id: string;
  condition: (event: Event, risks: Risk[], tasks: Task[]) => boolean;
  generate: (event: Event, risks: Risk[], tasks: Task[]) => Omit<Recommendation, 'id'>;
}

export const RECOMMENDATION_RULES: RecommendationRule[] = [
  {
    id: 'registration-shortfall',
    condition: (event) => {
      const percentage = event.currentRegistrations / event.targetRegistrations;
      return percentage < 0.7 && event.daysRemaining <= 7;
    },
    generate: (event, risks, tasks) => {
      const risk = risks.find(r => r.title === 'Registration Shortfall');
      const task = tasks.find(t => t.title.includes('waitlist'));
      return {
        action: 'Launch targeted LinkedIn and email campaign to waitlist and past attendees',
        reason: 'Historical data shows 12% conversion from waitlist and 8% from past-attendee emails in final week. Highest ROI channel for immediate registrations.',
        priority: 'urgent' as const,
        owner: 'marketing' as Role,
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expectedImpact: '+40-60 registrations',
        relatedRiskId: risk?.id,
        relatedTaskId: task?.id,
      };
    },
  },
  {
    id: 'venue-pending',
    condition: (event) => !event.venueConfirmed && event.daysRemaining <= 10,
    generate: (event, risks, tasks) => {
      const risk = risks.find(r => r.title === 'Venue Confirmation Pending');
      const task = tasks.find(t => t.title.includes('venue contract'));
      return {
        action: 'Escalate venue contract to legal and send final notice to venue provider',
        reason: 'Deposit deadline passed. Contract requires signature to secure venue. Legal escalation adds urgency.',
        priority: 'urgent' as const,
        owner: 'operations' as Role,
        deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expectedImpact: 'Secure venue, avoid relocation',
        relatedRiskId: risk?.id,
        relatedTaskId: task?.id,
      };
    },
  },
  {
    id: 'unconfirmed-partners',
    condition: (event) => event.partnerConfirmations < event.totalPartners,
    generate: (event, risks, tasks) => {
      const risk = risks.find(r => r.title === 'Unconfirmed Partners');
      const task = tasks.find(t => t.title.includes('partner benefit'));
      return {
        action: 'Direct outreach to unconfirmed partners with customized benefit summaries',
        reason: 'Partners cite unclear ROI. Personalized summaries addressing specific goals increased confirmation rate by 35% in past events.',
        priority: 'high' as const,
        owner: 'partnerships' as Role,
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expectedImpact: 'Confirm 1-2 additional partners',
        relatedRiskId: risk?.id,
        relatedTaskId: task?.id,
      };
    },
  },
  {
    id: 'overdue-tasks',
    condition: (event, risks, tasks) => tasks.some(t => t.status !== 'completed' && new Date(t.deadline) < new Date()),
    generate: (event, risks, tasks) => {
      const risk = risks.find(r => r.title === 'Overdue Operational Tasks');
      const task = tasks.find(t => t.title.includes('Redistribute'));
      return {
        action: 'Reassign overdue tasks to available team members with daily check-ins',
        reason: 'Overdue tasks block critical path. Current assignees at capacity. Redistribution with 24h check-ins reduces completion time by ~40%.',
        priority: 'high' as const,
        owner: 'operations' as Role,
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expectedImpact: 'Clear critical path blockers',
        relatedRiskId: risk?.id,
        relatedTaskId: task?.id,
      };
    },
  },
  {
    id: 'speaker-cancellation',
    condition: (event, risks) => risks.some(r => r.title === 'Speaker Cancellation Risk' && r.status === 'open'),
    generate: (event, risks, tasks) => {
      const risk = risks.find(r => r.title === 'Speaker Cancellation Risk');
      const task = tasks.find(t => t.title.includes('backup speakers'));
      return {
        action: 'Confirm backup speakers and send travel booking links',
        reason: 'Keynotes unconfirmed on travel. Backup speakers need 48h notice. Proactive booking prevents programme gaps.',
        priority: 'medium' as const,
        owner: 'programme' as Role,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expectedImpact: 'Guarantee keynote coverage',
        relatedRiskId: risk?.id,
        relatedTaskId: task?.id,
      };
    },
  },
  {
    id: 'referral-program',
    condition: (event) => event.currentRegistrations > 0 && event.daysRemaining <= 7,
    generate: (event, risks, tasks) => {
      const risk = risks.find(r => r.title === 'Registration Shortfall');
      const task = tasks.find(t => t.title.includes('referral'));
      return {
        action: 'Activate referral program for registered attendees',
        reason: 'Referral program generates 1.3 registrations per participant on average. Low effort, high leverage in final days.',
        priority: 'medium' as const,
        owner: 'marketing' as Role,
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expectedImpact: '+20-30 registrations',
        relatedRiskId: risk?.id,
        relatedTaskId: task?.id,
      };
    },
  },
  {
    id: 'catering-finalization',
    condition: (event, risks, tasks) => tasks.some(t => t.title.includes('catering') && t.status !== 'completed'),
    generate: (event, risks, tasks) => {
      const risk = risks.find(r => r.title === 'Overdue Operational Tasks');
      const task = tasks.find(t => t.title.includes('catering'));
      return {
        action: 'Finalize catering numbers and dietary requirements with vendor',
        reason: 'Catering finalization overdue. Vendor needs 48h notice. Delay risks incorrect quantities and dietary omissions.',
        priority: 'high' as const,
        owner: 'operations' as Role,
        deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expectedImpact: 'Accurate catering, avoid waste/shortage',
        relatedRiskId: risk?.id,
        relatedTaskId: task?.id,
      };
    },
  },
];

export function generateRecommendations(event: Event, risks: Risk[], tasks: Task[]): Omit<Recommendation, 'id'>[] {
  return RECOMMENDATION_RULES
    .filter(rule => rule.condition(event, risks, tasks))
    .map(rule => rule.generate(event, risks, tasks));
}