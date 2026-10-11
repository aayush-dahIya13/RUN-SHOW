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
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:bg-cyan-600 focus:ring-cyan-500',
      secondary: 'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700 active:bg-slate-600 focus:ring-slate-500',
      ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 active:bg-slate-700 focus:ring-slate-500',
      danger: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 active:bg-red-500/40 focus:ring-red-500',
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
        whileHover={variant !== 'ghost' ? { boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)' } : undefined}
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