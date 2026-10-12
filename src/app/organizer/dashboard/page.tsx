'use client';

import { motion } from 'motion/react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function OrganizerDashboardPage() {
  return (
    <ProtectedRoute role="organizer">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-dvh overflow-hidden">
        <DashboardLayout />
      </motion.div>
    </ProtectedRoute>
  );
}
