'use client';

import { HTMLAttributes, forwardRef } from 'react';

export const Skeleton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`animate-pulse bg-[var(--surface-elevated)] rounded ${className}`}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';