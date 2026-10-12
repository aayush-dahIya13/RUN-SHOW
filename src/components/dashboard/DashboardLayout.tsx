'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { KPICards, EventReadinessIndicator } from '@/components/dashboard/KPICards';
import { CriticalRisksSummary } from '@/components/dashboard/CriticalRisksSummary';
import { PartnerOverview } from '@/components/dashboard/PartnerOverview';
import { RegistrationTrendChart, OutreachConversionChart } from '@/components/charts/RegistrationChart';
import { RiskCentre } from '@/components/risks/RiskCentre';
import { Recommendations } from '@/components/recommendations/Recommendations';
import { Tasks } from '@/components/tasks/Tasks';
import { TaskDrawerContent } from '@/components/tasks/TaskDrawer';
import { EventSetupWizard } from '@/components/event-setup/EventSetupWizard';
import { useDashboardStore } from '@/lib/dashboard-state';
import { CalendarView } from '@/components/calendar/CalendarView';
import { EventHealthView } from '@/components/dashboard/EventHealthView';
import { DashboardOverviewSummary } from '@/components/dashboard/DashboardOverviewSummary';
import { SettingsView } from '@/components/settings/SettingsView';
import { RunshowAssistant } from '@/components/assistant/RunshowAssistant';

const VIEW_COMPONENTS = {
  setup: () => <EventSetupWizard />,
  overview: () => (
    <div className="space-y-6">
      <DashboardOverviewSummary />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <RegistrationTrendChart />
          <OutreachConversionChart />
        </div>
        <div className="space-y-6">
          <CriticalRisksSummary />
          <EventReadinessIndicator />
        </div>
      </div>
      <PartnerOverview />
      <Recommendations />
    </div>
  ),
  calendar: () => <CalendarView />,
  'event-health': () => <EventHealthView />,
  tasks: () => <Tasks />,
  settings: () => <SettingsView />,
  recommendations: () => <Recommendations />,
  partners: () => <PartnerOverview />,
  operations: () => (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <RiskCentre />
      <Tasks />
    </div>
  ),
};

const VIEW_TITLES: Record<keyof typeof VIEW_COMPONENTS, string> = {
  setup: 'Create Event',
  overview: 'Dashboard',
  calendar: 'Calendar',
  'event-health': 'Event Health',
  tasks: 'Tasks',
  settings: 'Settings',
  recommendations: 'Recommendations',
  partners: 'Partners',
  operations: 'Operations',
};

export function DashboardLayout() {
  const { selectedView, drawer, setSelectedView } = useDashboardStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const ViewComponent = VIEW_COMPONENTS[selectedView] || VIEW_COMPONENTS.overview;
  const title = VIEW_TITLES[selectedView] ?? 'Dashboard';

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-[var(--page-bg)] text-[var(--text-primary)]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header
          title={title}
          onCreateEvent={() => setSelectedView('setup')}
          onBackToDashboard={() => setSelectedView('overview')}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-4 pb-24 sm:p-6 sm:pb-28 lg:p-8 lg:pb-28" role="main">
          <motion.div
            key={selectedView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            className="space-y-6"
          >
            {selectedView !== 'setup' && (
              <>
                <div className="hidden lg:block" aria-hidden="true"><KPICards /></div>
                <div className="lg:hidden"><KPICards /></div>
              </>
            )}
            <ViewComponent />
          </motion.div>
        </main>
      </div>

      <TaskDrawerContent state={drawer} onClose={() => useDashboardStore.getState().closeDrawer()} />
      <RunshowAssistant />
    </div>
  );
}
