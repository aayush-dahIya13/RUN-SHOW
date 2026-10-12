'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { motion } from 'motion/react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--focus)] focus:ring-offset-2 focus:ring-offset-[var(--page-bg)] disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-[var(--action-primary)] text-[var(--action-primary-foreground)] hover:bg-[var(--action-primary-hover)] active:bg-[var(--action-primary-active)]',
      secondary: 'bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--neutral-surface)] active:bg-[var(--divider)]',
      ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] active:bg-[var(--neutral-surface)]',
      danger: 'bg-[var(--danger-surface)] text-[var(--danger)] border border-[var(--accent)] hover:bg-[var(--accent-muted)] active:bg-[var(--neutral-surface)]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };

    const MotionButton = motion.button as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    
    return (
      <MotionButton
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </MotionButton>
    );
  }
);

Button.displayName = 'Button';
