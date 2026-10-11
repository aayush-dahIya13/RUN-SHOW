import { Event, KPIData, Risk, Recommendation, Task, Role } from './types';

export function calculateKPIs(event: Event, tasks: Task[]): KPIData {
  const registrationsGap = event.targetRegistrations - event.currentRegistrations;
  const registrationsPercentage = event.targetRegistrations > 0
    ? Math.round((event.currentRegistrations / event.targetRegistrations) * 100)
    : 0;

  const partnerPercentage = event.totalPartners > 0
    ? Math.round((event.partnerConfirmations / event.totalPartners) * 100)
    : 0;

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const taskCompletionPercentage = tasks.length > 0
    ? Math.round((completedTasks / tasks.length) * 100)
    : 0;

  const eventReadiness = Math.round(
    (registrationsPercentage * 0.4) +
    (partnerPercentage * 0.2) +
    (taskCompletionPercentage * 0.3) +
    (event.venueConfirmed ? 10 : 0)
  );

  return {
    registrations: {
      current: event.currentRegistrations,
      target: event.targetRegistrations,
      gap: registrationsGap,
      percentage: registrationsPercentage,
    },
    partnerConfirmations: {
      current: event.partnerConfirmations,
      total: event.totalPartners,
      percentage: partnerPercentage,
    },
    taskCompletion: {
      completed: completedTasks,
      total: tasks.length,
      percentage: taskCompletionPercentage,
    },
    eventReadiness: Math.min(100, Math.max(0, eventReadiness)),
  };
}

export function getFilteredRisks(risks: Risk[], role: Role, severity?: Risk['severity'], status?: Risk['status']): Risk[] {
  return risks.filter(risk => {
    const roleMatch = role === 'leadership' || risk.owner === role;
    const severityMatch = !severity || risk.severity === severity;
    const statusMatch = !status || risk.status === status;
    return roleMatch && severityMatch && statusMatch;
  });
}

export function getFilteredRecommendations(recommendations: Recommendation[], role: Role, priority?: Recommendation['priority']): Recommendation[] {
  return recommendations.filter(rec => {
    const roleMatch = role === 'leadership' || rec.owner === role;
    const priorityMatch = !priority || rec.priority === priority;
    return roleMatch && priorityMatch;
  });
}

export function getFilteredTasks(tasks: Task[], role: Role, status?: Task['status']): Task[] {
  return tasks.filter(task => {
    const roleMatch = role === 'leadership' || task.assignee === role;
    const statusMatch = !status || task.status === status;
    return roleMatch && statusMatch;
  });
}

export function getTaskById(tasks: Task[], id: string): Task | undefined {
  return tasks.find(t => t.id === id);
}

export function getRiskById(risks: Risk[], id: string): Risk | undefined {
  return risks.find(r => r.id === id);
}

export function getRecommendationById(recommendations: Recommendation[], id: string): Recommendation | undefined {
  return recommendations.find(r => r.id === id);
}

export function getUpcomingDeadlines(tasks: Task[], days: number = 3): Task[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return tasks
    .filter(t => t.status !== 'completed' && new Date(t.deadline) <= cutoff)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
}

export function getOverdueTasks(tasks: Task[]): Task[] {
  const now = new Date();
  return tasks
    .filter(t => t.status !== 'completed' && new Date(t.deadline) < now)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
}

export function getRiskCountBySeverity(risks: Risk[]): Record<Risk['severity'], number> {
  return risks.reduce((acc, risk) => {
    acc[risk.severity] = (acc[risk.severity] || 0) + 1;
    return acc;
  }, { critical: 0, high: 0, medium: 0, low: 0 });
}

export function getTaskCountByStatus(tasks: Task[]): Record<Task['status'], number> {
  return tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, { pending: 0, 'in-progress': 0, completed: 0, blocked: 0 });
}

export function simulateRegistrationOutcome(currentRegistrations: number, taskId: string): number {
  const outcomes: Record<string, number> = {
    'task-1': 50,
    'task-6': 25,
  };
  return currentRegistrations + (outcomes[taskId] || 0);
}