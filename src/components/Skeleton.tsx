import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`relative overflow-hidden rounded bg-gray-200/60 dark:bg-white/10 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(255,255,255,.35)_40%,rgba(255,255,255,0)_80%)] dark:bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(255,255,255,.12)_40%,rgba(255,255,255,0)_80%)]" />
  </div>
);

export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-4 w-full" />
    ))}
  </div>
);

export const CardSkeleton: React.FC<{ lines?: number; className?: string }> = ({ lines = 4, className = '' }) => (
  <div className={`p-4 border rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-inner-glow ${className}`}>
    <Skeleton className="h-6 w-1/3 mb-4" />
    <TextSkeleton lines={lines} />
  </div>
);
