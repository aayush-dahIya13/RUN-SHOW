'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', padding = 'md', hover = false, children, ...props }, ref) => {
    const reduceMotion = useReducedMotion();
    const variants = {
      default: 'runshow-card',
      glass: 'runshow-card runshow-card-glass',
      elevated: 'runshow-card runshow-card-elevated',
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const MotionDiv = motion.div as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    
    return (
      <MotionDiv
        ref={ref}
        className={`${variants[variant]} ${paddings[padding]} rounded-xl ${className}`}
        whileHover={hover && !reduceMotion ? { y: -2 } : undefined}
        transition={hover && !reduceMotion ? { duration: 0.2 } : undefined}
        {...props}
      >
        {children}
      </MotionDiv>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', children, ...props }, ref) => (
    <h3 ref={ref} className={`text-lg font-semibold text-[var(--text-primary)] ${className}`} {...props}>
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', children, ...props }, ref) => (
    <p ref={ref} className={`text-sm text-[var(--text-secondary)] mt-1 ${className}`} {...props}>
      {children}
    </p>
  )
);

CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`mt-4 pt-4 border-t border-[var(--divider)] flex items-center gap-2 ${className}`} {...props}>
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';
