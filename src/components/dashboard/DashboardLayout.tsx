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

const VIEW_COMPONENTS = {
  setup: () => <EventSetupWizard />,
  overview: () => (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RegistrationTrendChart />
          <OutreachConversionChart />
        </div>
        <div className="space-y-6">
          <CriticalRisksSummary />
          <EventReadinessIndicator />
        </div>
      </div>
    </>
  ),
  'event-health': () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <RegistrationTrendChart />
      <OutreachConversionChart />
    </div>
  ),
  recommendations: () => <Recommendations />,
  tasks: () => <Tasks />,
  partners: () => (
    <div className="space-y-6">
      <PartnerOverview />
    </div>
  ),
  operations: () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <RiskCentre />
      <Tasks />
    </div>
  ),
};

export function DashboardLayout() {
  const { selectedView, drawer } = useDashboardStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const ViewComponent = VIEW_COMPONENTS[selectedView] || VIEW_COMPONENTS.overview;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col min-w-0 ml-0 md:ml-72 transition-all duration-300">
        <Header />
        
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto" role="main">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {selectedView !== 'setup' && (
              <>
                <div className="hidden lg:block" aria-hidden="true">
                  <KPICards />
                </div>
                <div className="lg:hidden">
                  <KPICards />
                </div>
              </>
            )}

            <ViewComponent />
          </motion.div>
        </main>
      </div>

      <TaskDrawerContent state={drawer} onClose={() => useDashboardStore.getState().closeDrawer()} />
    </div>
  );
}
