'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useDashboardStore } from '@/lib/dashboard-state';
import { motion } from 'motion/react';

export default function Home() {
  const { resetToDefaults } = useDashboardStore();

  React.useEffect(() => {
    resetToDefaults();
  }, [resetToDefaults]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen"
    >
      <DashboardLayout />
    </motion.div>
  );
}

import React from 'react';