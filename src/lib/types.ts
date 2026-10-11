export type Role = 'marketing' | 'partnerships' | 'operations' | 'programme' | 'leadership';

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';

export type RiskStatus = 'open' | 'in-progress' | 'mitigated' | 'closed';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'blocked';

export type RecommendationPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface Event {
  id: string;
  name: string;
  date: string;
  targetRegistrations: number;
  currentRegistrations: number;
  partnerConfirmations: number;
  totalPartners: number;
  venueConfirmed: boolean;
  daysRemaining: number;
}

export interface Risk {
  id: string;
  title: string;
  severity: RiskSeverity;
  reason: string;
  owner: Role;
  deadline?: string;
  status: RiskStatus;
  relatedRecommendationId?: string;
  relatedTaskId?: string;
}

export interface Recommendation {
  id: string;
  action: string;
  reason: string;
  priority: RecommendationPriority;
  owner: Role;
  deadline: string;
  expectedImpact: string;
  relatedRiskId?: string;
  relatedTaskId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  assignee: Role;
  deadline: string;
  status: TaskStatus;
  relatedRiskId?: string;
  relatedRecommendationId?: string;
}

export interface KPIData {
  registrations: {
    current: number;
    target: number;
    gap: number;
    percentage: number;
  };
  partnerConfirmations: {
    current: number;
    total: number;
    percentage: number;
  };
  taskCompletion: {
    completed: number;
    total: number;
    percentage: number;
  };
  eventReadiness: number;
}

export interface ChartDataPoint {
  date: string;
  registrations: number;
  target?: number;
}

export interface OutreachDataPoint {
  channel: string;
  sent: number;
  converted: number;
  conversionRate: number;
}

export interface DashboardState {
  selectedRole: Role;
  selectedView: 'overview' | 'event-health' | 'recommendations' | 'tasks' | 'partners' | 'operations';
  risks: Risk[];
  recommendations: Recommendation[];
  tasks: Task[];
  notifications: Notification[];
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

export interface DrawerState {
  isOpen: boolean;
  task: Task | null;
  type: 'task' | 'recommendation' | 'risk';
}

export interface Partner {
  id: string;
  name: string;
  type: 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  status: 'confirmed' | 'pending';
  contact: string;
  deadline: string;
}