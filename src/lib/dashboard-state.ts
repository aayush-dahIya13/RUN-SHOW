'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Role, Task, DashboardState, Notification, DrawerState, KPIData, Recommendation, Risk, Event } from './types';
import { DEMO_EVENT, DEMO_RISKS, DEMO_RECOMMENDATIONS, DEMO_TASKS } from './demo-data';
import { calculateKPIs, simulateRegistrationOutcome } from './calculations';
import { generateRecommendations } from './recommendation-rules';
import { api } from './api';

interface StoreState extends DashboardState {
  kpis: KPIData;
  drawer: DrawerState;
  event: Event;
  isUsingApi: boolean;
  setSelectedRole: (role: Role) => void;
  setSelectedView: (view: DashboardState['selectedView']) => void;
  openDrawer: (task: Task, type?: DrawerState['type']) => void;
  closeDrawer: () => void;
  completeTask: (taskId: string) => Promise<void>;
  completeTaskSync: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>;
  updateTaskStatusSync: (taskId: string, status: Task['status']) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  recalculateKPIs: () => void;
  regenerateRecommendations: () => Promise<void>;
  regenerateRecommendationsSync: () => void;
  simulateRegistrationIncrease: (taskId: string) => void;
  resetToDefaults: () => void;
  initializeFromApi: (eventId: string) => Promise<void>;
}

const initialRisks = [...DEMO_RISKS];
const initialRecommendations = [...DEMO_RECOMMENDATIONS];
const initialTasks = [...DEMO_TASKS];

function buildRecommendationMap(recommendations: Recommendation[]): Map<string, Recommendation> {
  const map = new Map<string, Recommendation>();
  recommendations.forEach(r => map.set(r.id, r));
  return map;
}

function mergeRecommendations(generated: Omit<Recommendation, 'id'>[], existingMap: Map<string, Recommendation>): Recommendation[] {
  return generated.map((rec, index) => {
    const existingKey = `${rec.owner}-${rec.action.slice(0, 20)}`;
    const existing = existingMap.get(existingKey);
    if (existing) return { ...rec, id: existing.id };
    return { ...rec, id: `rec-gen-${Date.now()}-${index}` };
  });
}

const syncCompleteTask = (set: (partial: StoreState | Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void, get: () => StoreState, taskId: string) => {
  const { tasks, event, risks, recommendations } = get();
  const task = tasks.find((t: Task) => t.id === taskId);
  if (!task || task.status === 'completed') return;

  const updatedTasks = tasks.map((t: Task) =>
    t.id === taskId ? { ...t, status: 'completed' as const } : t
  );

  let updatedEvent = { ...event };
  let updatedRisks = [...risks];
  const updatedRecommendations = [...recommendations];

  if (task.relatedRiskId) {
    updatedRisks = updatedRisks.map((r: Risk) =>
      r.id === task.relatedRiskId ? { ...r, status: 'mitigated' as const } : r
    );
  }

  if (taskId === 'task-1' || taskId === 'task-6') {
    updatedEvent = {
      ...updatedEvent,
      currentRegistrations: simulateRegistrationOutcome(updatedEvent.currentRegistrations, taskId),
    };
  }

  if (taskId === 'task-2') {
    updatedEvent = { ...updatedEvent, venueConfirmed: true };
    updatedRisks = updatedRisks.map((r: Risk) =>
      r.id === 'risk-2' ? { ...r, status: 'mitigated' as const } : r
    );
  }

  if (taskId === 'task-3') {
    updatedEvent = { ...updatedEvent, partnerConfirmations: updatedEvent.partnerConfirmations + 1 };
    updatedRisks = updatedRisks.map((r: Risk) =>
      r.id === 'risk-3' ? { ...r, status: 'mitigated' as const } : r
    );
  }

  const newKpis = calculateKPIs(updatedEvent, updatedTasks);

  const existingRecMap = buildRecommendationMap(updatedRecommendations);
  const generatedRecs = generateRecommendations(updatedEvent, updatedRisks, updatedTasks);
  const mergedRecommendations = mergeRecommendations(generatedRecs, existingRecMap);

  const newNotification: Notification = {
    id: `notif-${Date.now()}`,
    message: `Task completed: ${task.title}`,
    type: 'success',
    timestamp: new Date().toISOString(),
    read: false,
  };

  set({
    tasks: updatedTasks,
    event: updatedEvent,
    risks: updatedRisks,
    recommendations: mergedRecommendations,
    kpis: newKpis,
    notifications: [newNotification, ...get().notifications].slice(0, 10),
  });
};

const syncRegenerateRecommendations = (set: (partial: StoreState | Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void, get: () => StoreState) => {
  const { event, risks, tasks, recommendations } = get();
  const existingRecMap = buildRecommendationMap(recommendations);
  const generatedRecs = generateRecommendations(event, risks, tasks);
  const mergedRecommendations = mergeRecommendations(generatedRecs, existingRecMap);
  set({ recommendations: mergedRecommendations });
};

export const useDashboardStore = create<StoreState>()(
  persist(
    (set, get) => ({
      selectedRole: 'leadership',
      selectedView: 'overview',
      risks: initialRisks,
      recommendations: initialRecommendations,
      tasks: initialTasks,
      notifications: [],
      kpis: calculateKPIs(DEMO_EVENT, initialTasks),
      drawer: { isOpen: false, task: null, type: 'task' },
      event: { ...DEMO_EVENT },
      isUsingApi: api.isUsingApi(),

      setSelectedRole: (role) => set({ selectedRole: role }),

      setSelectedView: (view) => set({ selectedView: view }),

      openDrawer: (task, type = 'task') => set({ drawer: { isOpen: true, task, type } }),

      closeDrawer: () => set({ drawer: { isOpen: false, task: null, type: 'task' } }),

      completeTask: async (taskId) => {
        if (get().isUsingApi) {
          try {
            const result = await api.completeTask(taskId, {
              registrationsAdded: taskId === 'task-1' ? 50 : taskId === 'task-6' ? 25 : 0,
              source: 'simulated',
            });
            const newKpis = calculateKPIs(result.event, result.task.status === 'completed' ? 
              get().tasks.map(t => t.id === taskId ? { ...t, status: 'completed' as const } : t) : get().tasks);
            const newNotification: Notification = {
              id: `notif-${Date.now()}`,
              message: `Task completed: ${result.task.title}`,
              type: 'success',
              timestamp: new Date().toISOString(),
              read: false,
            };
            set({
              tasks: get().tasks.map((t: Task) => t.id === taskId ? { ...t, status: 'completed' as const } : t),
              event: result.event,
              risks: result.risks,
              recommendations: result.recommendations,
              kpis: newKpis,
              notifications: [newNotification, ...get().notifications].slice(0, 10),
            });
          } catch (e) {
            console.error('API completeTask failed, falling back to sync:', e);
            syncCompleteTask(set, get, taskId);
          }
        } else {
          syncCompleteTask(set, get, taskId);
        }
      },

      completeTaskSync: (taskId) => syncCompleteTask(set, get, taskId),

      updateTaskStatus: async (taskId, status) => {
        if (get().isUsingApi) {
          try {
            const updatedTask = await api.updateTaskStatus(taskId, status);
            set(state => ({
              tasks: state.tasks.map(t => t.id === taskId ? updatedTask : t),
            }));
          } catch (e) {
            console.error('API updateTaskStatus failed, falling back to sync:', e);
            get().updateTaskStatusSync(taskId, status);
          }
        } else {
          get().updateTaskStatusSync(taskId, status);
        }
      },

      updateTaskStatusSync: (taskId, status) => {
        set(state => ({
          tasks: state.tasks.map(t => t.id === taskId ? { ...t, status } : t),
        }));
      },

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: `notif-${Date.now()}`,
          timestamp: new Date().toISOString(),
          read: false,
        };
        set(state => ({
          notifications: [newNotification, ...state.notifications].slice(0, 10),
        }));
      },

      markNotificationRead: (id) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      recalculateKPIs: () => {
        const { event, tasks } = get();
        set({ kpis: calculateKPIs(event, tasks) });
      },

      regenerateRecommendations: async () => {
        if (get().isUsingApi) {
          try {
            const recs = await api.regenerateRecommendations(get().event.id);
            set({ recommendations: recs });
          } catch (e) {
            console.error('API regenerateRecommendations failed, falling back to sync:', e);
            syncRegenerateRecommendations(set, get);
          }
        } else {
          syncRegenerateRecommendations(set, get);
        }
      },

      regenerateRecommendationsSync: () => syncRegenerateRecommendations(set, get),

      simulateRegistrationIncrease: (taskId) => {
        const { event, tasks } = get();
        const newRegistrations = simulateRegistrationOutcome(event.currentRegistrations, taskId);
        const updatedEvent = { ...event, currentRegistrations: newRegistrations };
        const newKpis = calculateKPIs(updatedEvent, tasks);
        set({ event: updatedEvent, kpis: newKpis });
      },

      resetToDefaults: () => {
        const newKpis = calculateKPIs(DEMO_EVENT, initialTasks);
        set({
          selectedRole: 'leadership',
          selectedView: 'overview',
          risks: [...initialRisks],
          recommendations: [...initialRecommendations],
          tasks: [...initialTasks],
          notifications: [],
          kpis: newKpis,
          drawer: { isOpen: false, task: null, type: 'task' },
          event: { ...DEMO_EVENT },
        });
      },

      initializeFromApi: async (eventId: string) => {
        if (!get().isUsingApi) return;
        try {
          const [event, risks, recommendations, tasks] = await Promise.all([
            api.getEvent(eventId),
            api.getRisks(eventId),
            api.getRecommendations(eventId),
            api.getTasks(eventId),
          ]);
          const kpis = calculateKPIs(event, tasks);
          set({ event, risks, recommendations, tasks, kpis, isUsingApi: true });
        } catch (e) {
          console.error('Failed to initialize from API, using demo data:', e);
          set({ isUsingApi: false });
        }
      },
    }),
    {
      name: 'eventpilot-dashboard-store',
      partialize: (state) => ({
        selectedRole: state.selectedRole,
        selectedView: state.selectedView,
        risks: state.risks,
        recommendations: state.recommendations,
        tasks: state.tasks,
        notifications: state.notifications,
        event: state.event,
      }),
    }
  )
);