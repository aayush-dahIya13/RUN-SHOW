'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { motion } from 'motion/react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', size = 'md', dot = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-slate-800 text-slate-300 border border-slate-700',
      success: 'bg-green-500/15 text-green-400 border border-green-500/30',
      warning: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
      danger: 'bg-red-500/15 text-red-400 border border-red-500/30',
      info: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
      neutral: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs gap-1',
      md: 'px-2.5 py-1 text-xs gap-1.5',
    };

    const MotionSpan = motion.span as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    
    return (
      <MotionSpan
        ref={ref}
        className={`inline-flex items-center font-medium rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        {...props}
      >
        {dot && (
          <span className={`w-1.5 h-1.5 rounded-full ${variant === 'success' ? 'bg-green-400' : variant === 'warning' ? 'bg-yellow-400' : variant === 'danger' ? 'bg-red-400' : variant === 'info' ? 'bg-cyan-400' : 'bg-slate-400'}`} />
        )}
        {children}
      </MotionSpan>
    );
  }
);

Badge.displayName = 'Badge';