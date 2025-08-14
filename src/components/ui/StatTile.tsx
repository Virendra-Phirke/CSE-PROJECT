import React from 'react';
import { cn } from './cn';
import { AnimatedNumber } from './AnimatedNumber';
import { GradientText } from './GradientText';

interface StatTileProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  description?: string;
  accent?: 'pink' | 'purple' | 'teal' | 'indigo' | 'blue';
}

export const StatTile: React.FC<StatTileProps> = ({ label, value, icon, description, accent='purple' }) => {
  return (
    <div className='group relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-white/5 to-white/0 dark:from-white/10 dark:to-white/5 border border-white/10 backdrop-blur-xl shadow-inner-glow hover:shadow-glow transition-all'>
      <div className='absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br pointer-events-none mix-blend-overlay' />
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white shadow-md mb-4', `from-${accent}-500/90 to-${accent}-600/90`)}>
        {icon}
      </div>
      <p className='text-xs uppercase tracking-wider text-gray-400 font-medium'>{label}</p>
      <h3 className='text-3xl font-bold mt-2 mb-2'>
        <GradientText><AnimatedNumber value={value} /></GradientText>
      </h3>
      {description && <p className='text-xs text-gray-500'>{description}</p>}
    </div>
  );
};
