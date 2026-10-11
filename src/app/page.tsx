'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { motion } from 'motion/react';

export default function Home() {
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
