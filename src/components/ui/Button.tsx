'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    const reduceMotion = useReducedMotion();
    const baseStyles = 'inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full font-medium shadow-[inset_0_1px_0_rgb(255_255_255_/_0.08)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none';
    
    const variants = {
      primary: 'border border-white/10 bg-[var(--action-primary-fill)] text-[var(--action-primary-foreground)] shadow-sm hover:border-white/20 hover:bg-[var(--action-primary-fill-hover)] active:bg-[var(--action-primary-fill-active)]',
      secondary: 'border border-[var(--border)] bg-[var(--surface-elevated)]/85 text-[var(--text-primary)] backdrop-blur-sm hover:border-[var(--action-primary)]/40 hover:bg-[var(--neutral-surface)] active:bg-[var(--divider)]',
      ghost: 'border border-transparent bg-transparent text-[var(--text-secondary)] shadow-none hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] active:bg-[var(--neutral-surface)]',
      danger: 'border border-[var(--danger)]/30 bg-[var(--danger-surface)]/85 text-[var(--danger)] backdrop-blur-sm hover:border-[var(--danger)]/50 hover:bg-[var(--accent-muted)] active:bg-[var(--neutral-surface)]',
    };

    const sizes = {
      sm: 'min-h-9 px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };

    const MotionButton = motion.button as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    
    return (
      <MotionButton
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        whileHover={reduceMotion || disabled || loading ? undefined : { y: -1 }}
        whileTap={reduceMotion || disabled || loading ? undefined : { y: 0, scale: 0.98 }}
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
