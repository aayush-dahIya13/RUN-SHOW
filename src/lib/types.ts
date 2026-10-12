export type Role = 'marketing' | 'partnerships' | 'operations' | 'programme' | 'leadership';

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';

export type RiskStatus = 'open' | 'in-progress' | 'mitigated' | 'closed';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'blocked';

export type RecommendationPriority = 'urgent' | 'high' | 'medium' | 'low';

export type AccountRole = 'organizer' | 'sub_organizer' | 'participant';

export interface EventSession {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  description: string;
  functionName?: string;
}

export interface TeamAssignment {
  id: string;
  accountId: string;
  eventId: string;
  functionName: string;
  responsibilities: Role[];
  active: boolean;
}

export interface ParticipantEventLink {
  accountId: string;
  eventId: string;
  registrationStatus?: 'invited' | 'registered' | 'cancelled';
}

export interface Announcement {
  id: string;
  eventId: string;
  title: string;
  message: string;
  publishedAt: string;
  isDemo: boolean;
}

export interface Event {
  id: string;
  name: string;
  type?: string;
  date: string;
  startDate?: string;
  endDate?: string;
  targetRegistrations: number;
  currentRegistrations: number;
  participantCapacity?: number;
  partnerConfirmations: number;
  totalPartners: number;
  venueConfirmed: boolean;
  daysRemaining: number;
  audience?: string;
  format?: 'in-person' | 'virtual' | 'hybrid';
  venue?: string;
  objectives?: string[];
  successMetrics?: string[];
  budget?: number;
  operationalRequirements?: string;
  isDemo?: boolean;
  sessions?: EventSession[];
  participantInstructions?: string;
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
  eventId?: string;
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
  eventId?: string;
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
  eventId?: string;
  functionName?: string;
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
  selectedView: 'home' | 'setup' | 'overview' | 'calendar' | 'event-health' | 'settings' | 'recommendations' | 'tasks' | 'partners' | 'operations';
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

export interface EventSetupFormData {
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  partnerDeadline: string;
  contentDeadline: string;
  audience: string;
  targetRegistrations: number;
  currentRegistrations: number;
  venue: string;
  format: 'in-person' | 'virtual' | 'hybrid';
  objectives: string;
  successMetrics: string;
  budget?: number;
  operationalRequirements: string;
  expectedPartners: number;
  participantCapacity?: number;
  sessions?: EventSession[];
}

export interface EventMilestone {
  id: string;
  title: string;
  description: string;
  owner: Role;
  deadline: string;
  priority: RecommendationPriority;
}

export interface EventPlan {
  id: string;
  eventDraft: EventSetupFormData;
  milestones: EventMilestone[];
  tasks: Task[];
  risks: Risk[];
  successMetrics: string[];
  outreachTargets: {
    channel: string;
    target: number;
    owner: Role;
  }[];
  generatedAt: string;
  generator: 'deterministic';
}
