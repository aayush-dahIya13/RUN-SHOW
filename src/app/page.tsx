'use client';

import { AuthPage } from '@/components/auth/AuthPage';
import { motion } from 'motion/react';

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen"
    >
      <AuthPage />
    </motion.div>
  );
}
