'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { motion } from 'motion/react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'secondary' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', size = 'md', dot = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--neutral-surface)] text-[var(--text-primary)] border border-[var(--border)]',
      success: 'bg-[var(--success-surface)] text-[var(--action-primary)] border border-[var(--action-primary)]',
      warning: 'bg-[var(--accent-muted)] text-[var(--accent-foreground)] border border-[var(--accent)]',
      danger: 'bg-[var(--danger-surface)] text-[var(--danger)] border border-[var(--accent)]',
      info: 'bg-[var(--success-surface)] text-[var(--action-primary)] border border-[var(--action-primary)]',
      neutral: 'bg-[var(--neutral-surface)] text-[var(--text-secondary)] border border-[var(--border)]',
      secondary: 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border)]',
      outline: 'bg-transparent text-[var(--text-secondary)] border border-[var(--border)]',
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
          <span className={`w-1.5 h-1.5 rounded-full ${variant === 'success' || variant === 'info' ? 'bg-[var(--action-primary)]' : variant === 'warning' || variant === 'danger' ? 'bg-[var(--accent)]' : 'bg-[var(--text-secondary)]'}`} />
        )}
        {children}
      </MotionSpan>
    );
  }
);

Badge.displayName = 'Badge';
