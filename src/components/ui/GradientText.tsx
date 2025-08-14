import React from 'react';
import { cn } from './cn';

export const GradientText: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ className, children, ...rest }) => (
  <span
    className={cn('bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent', className)}
    {...rest}
  >
    {children}
  </span>
);
