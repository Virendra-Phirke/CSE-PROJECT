import React from 'react';
import { cn } from './cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: boolean;
  gradient?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  children,
  interactive,
  padding = true,
  gradient,
  ...rest
}) => {
  return (
    <div
      className={cn(
        'relative rounded-3xl border border-white/10 bg-white/5 dark:bg-white/5 backdrop-blur-xl shadow-inner-glow overflow-hidden',
        interactive && 'transition-all hover:shadow-glow hover:border-white/20 hover:-translate-y-0.5',
        padding && 'p-6 md:p-8',
        gradient && 'before:absolute before:inset-0 before:bg-gradient-to-br before:from-pink-500/10 before:to-purple-500/10 before:pointer-events-none',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};
