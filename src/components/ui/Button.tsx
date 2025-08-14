import React from 'react';
import { cn } from './cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'glass';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  pill?: boolean;
}

const base = 'relative inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';
const sizes: Record<string,string> = {
  sm: 'text-xs px-3 h-8 rounded-lg',
  md: 'text-sm px-4 h-10 rounded-xl',
  lg: 'text-base px-6 h-12 rounded-2xl'
};
const variants: Record<string,string> = {
  primary: 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-500 text-white shadow-glow hover:brightness-110 active:scale-[.97]',
  secondary: 'bg-dark-bg-tertiary/70 text-dark-text-primary dark:text-white border border-white/10 hover:bg-white/10',
  outline: 'border border-pink-500/40 text-pink-400 hover:bg-pink-500/10',
  ghost: 'text-gray-600 dark:text-gray-300 hover:bg-white/10',
  glass: 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/15',
  destructive: 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-glow hover:brightness-110'
};

export const Button: React.FC<ButtonProps> = ({
  variant='primary',
  size='md',
  pill,
  loading,
  leftIcon,
  rightIcon,
  className,
  children,
  ...rest
}) => {
  return (
    <button
      className={cn(base, sizes[size], variants[variant], pill && 'rounded-pill px-8', 'focus-visible:ring-pink-500/70 dark:focus-visible:ring-pink-400/60', className)}
      {...rest}
    >
      {loading && <span className='absolute inset-0 flex items-center justify-center'><span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin'/></span>}
      <span className={cn('flex items-center gap-2', loading && 'opacity-0')}>{leftIcon}{children}{rightIcon}</span>
    </button>
  );
};
