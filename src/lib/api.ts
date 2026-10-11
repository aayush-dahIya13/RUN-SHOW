'use client';

import {
  Event,
  Risk,
  Recommendation,
  Task,
  KPIData,
  Partner,
  Role,
  RiskSeverity,
  RiskStatus,
  TaskStatus,
  RecommendationPriority,
} from './types';
import {
  DEMO_EVENT,
  DEMO_RISKS,
  DEMO_RECOMMENDATIONS,
  DEMO_TASKS,
} from './demo-data';
import { calculateKPIs, simulateRegistrationOutcome } from './calculations';
import { generateRecommendations } from './recommendation-rules';

const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!USE_API) {
    throw new Error('API disabled');
  }
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API error: ${res.status}`);
  }
  return res.json();
}

function buildRecommendationMap(recommendations: Recommendation[]): Map<string, Recommendation> {
  const map = new Map<string, Recommendation>();
  recommendations.forEach(r => map.set(r.id, r));
  return map;
}

function mergeRecommendations(
  generated: Omit<Recommendation, 'id'>[],
  existingMap: Map<string, Recommendation>
): Recommendation[] {
  return generated.map((rec, index) => {
    const existingKey = `${rec.owner}-${rec.action.slice(0, 20)}`;
    const existing = existingMap.get(existingKey);
    if (existing) return { ...rec, id: existing.id };
    return { ...rec, id: `rec-gen-${Date.now()}-${index}` };
  });
}

export const api = {
  async getEvent(eventId: string): Promise<Event> {
    if (USE_API) return fetchJson<Event>(`/events/${eventId}`);
    return DEMO_EVENT;
  },

  async createEvent(event: Omit<Event, 'id' | 'daysRemaining'>): Promise<Event> {
    if (USE_API) return fetchJson<Event>('/events', { method: 'POST', body: JSON.stringify(event) });
    return { ...event, id: `evt-${Date.now()}`, daysRemaining: 0 };
  },

  async getMetrics(eventId: string): Promise<KPIData> {
    if (USE_API) return fetchJson<KPIData>(`/events/${eventId}/metrics`);
    const event = await this.getEvent(eventId);
    const tasks = await this.getTasks(eventId);
    return calculateKPIs(event, tasks);
  },

  async getRisks(eventId: string, filters?: { role?: Role; severity?: RiskSeverity; status?: RiskStatus }): Promise<Risk[]> {
    if (USE_API) {
      const params = new URLSearchParams();
      if (filters?.role) params.set('role', filters.role);
      if (filters?.severity) params.set('severity', filters.severity);
      if (filters?.status) params.set('status', filters.status);
      return fetchJson<Risk[]>(`/events/${eventId}/risks?${params}`);
    }
    return DEMO_RISKS;
  },

  async updateRiskStatus(riskId: string, status: RiskStatus): Promise<Risk> {
    if (USE_API) return fetchJson<Risk>(`/risks/${riskId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    const risk = DEMO_RISKS.find(r => r.id === riskId);
    if (!risk) throw new Error('Risk not found');
    return { ...risk, status };
  },

  async getRecommendations(eventId: string, filters?: { role?: Role; priority?: RecommendationPriority }): Promise<Recommendation[]> {
    if (USE_API) {
      const params = new URLSearchParams();
      if (filters?.role) params.set('role', filters.role);
      if (filters?.priority) params.set('priority', filters.priority);
      return fetchJson<Recommendation[]>(`/events/${eventId}/recommendations?${params}`);
    }
    const event = await this.getEvent(eventId);
    const risks = await this.getRisks(eventId);
    const tasks = await this.getTasks(eventId);
    return generateRecommendations(event, risks, tasks).map((r, i) => ({ ...r, id: `rec-${i}` }));
  },

  async regenerateRecommendations(eventId: string): Promise<Recommendation[]> {
    if (USE_API) return fetchJson<Recommendation[]>(`/events/${eventId}/recommendations/regenerate`, { method: 'POST' });
    const event = await this.getEvent(eventId);
    const risks = await this.getRisks(eventId);
    const tasks = await this.getTasks(eventId);
    return generateRecommendations(event, risks, tasks).map((r, i) => ({ ...r, id: `rec-gen-${Date.now()}-${i}` }));
  },

  async getTasks(eventId: string, filters?: { role?: Role; status?: TaskStatus }): Promise<Task[]> {
    if (USE_API) {
      const params = new URLSearchParams();
      if (filters?.role) params.set('role', filters.role);
      if (filters?.status) params.set('status', filters.status);
      return fetchJson<Task[]>(`/events/${eventId}/tasks?${params}`);
    }
    return DEMO_TASKS;
  },

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
    if (USE_API) return fetchJson<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    const task = DEMO_TASKS.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    return { ...task, status };
  },

  async completeTask(taskId: string, outcome?: { registrationsAdded: number; source: 'simulated' | 'actual' }): Promise<{
    task: Task;
    event: Event;
    risks: Risk[];
    recommendations: Recommendation[];
  }> {
    if (USE_API) {
      return fetchJson(`/tasks/${taskId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ outcome }),
      });
    }
    const task = DEMO_TASKS.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const updatedTask = { ...task, status: 'completed' as TaskStatus };
    const event = { ...DEMO_EVENT };
    const risks = [...DEMO_RISKS];
    const recommendations = [...DEMO_RECOMMENDATIONS];

    if (task.relatedRiskId) {
      const idx = risks.findIndex(r => r.id === task.relatedRiskId);
      if (idx >= 0) risks[idx] = { ...risks[idx], status: 'mitigated' };
    }

    if (taskId === 'task-1' || taskId === 'task-6') {
      event.currentRegistrations = simulateRegistrationOutcome(event.currentRegistrations, taskId);
    }
    if (taskId === 'task-2') event.venueConfirmed = true;
    if (taskId === 'task-3') event.partnerConfirmations += 1;

    const existingRecMap = buildRecommendationMap(recommendations);
    const generatedRecs = generateRecommendations(event, risks, DEMO_TASKS);
    const mergedRecommendations = mergeRecommendations(generatedRecs, existingRecMap);

    return { task: updatedTask, event, risks, recommendations: mergedRecommendations };
  },

  async getPartners(eventId: string): Promise<Partner[]> {
    if (USE_API) return fetchJson<Partner[]>(`/events/${eventId}/partners`);
    return [
      { id: 'partner-1', name: 'TechCorp Solutions', type: 'Platinum', status: 'confirmed', contact: 'Sarah Chen', deadline: '2026-10-12' },
      { id: 'partner-2', name: 'CloudScale Inc', type: 'Gold', status: 'confirmed', contact: 'Marcus Johnson', deadline: '2026-10-12' },
      { id: 'partner-3', name: 'DevTools Pro', type: 'Silver', status: 'confirmed', contact: 'Emily Rodriguez', deadline: '2026-10-13' },
      { id: 'partner-4', name: 'StartupHub', type: 'Silver', status: 'pending', contact: 'David Kim', deadline: '2026-10-13' },
      { id: 'partner-5', name: 'CodeAcademy', type: 'Bronze', status: 'pending', contact: 'Lisa Wang', deadline: '2026-10-13' },
    ];
  },

  async updatePartnerStatus(partnerId: string, status: 'confirmed' | 'pending'): Promise<Partner> {
    if (USE_API) return fetchJson<Partner>(`/partners/${partnerId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    const partners = await this.getPartners('techsprint-delhi-2026');
    const p = partners.find(x => x.id === partnerId);
    if (!p) throw new Error('Partner not found');
    return { ...p, status };
  },

  async recordRegistrationOutcome(eventId: string, payload: { taskId: string; registrationsAdded: number; source: 'simulated' | 'actual' }): Promise<Event> {
    if (USE_API) return fetchJson<Event>(`/events/${eventId}/registration-outcome`, { method: 'POST', body: JSON.stringify(payload) });
    const event = { ...DEMO_EVENT, currentRegistrations: DEMO_EVENT.currentRegistrations + payload.registrationsAdded };
    return event;
  },

  isUsingApi(): boolean {
    return USE_API;
  },
};