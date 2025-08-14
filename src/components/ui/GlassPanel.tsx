import React from 'react';
import { cn } from './cn';

export const GlassPanel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...rest }) => (
  <div
    className={cn('relative rounded-2xl bg-white/6 dark:bg-white/5 border border-white/15 backdrop-blur-lg shadow-inner-glow', className)}
    {...rest}
  >
    {children}
  </div>
);
