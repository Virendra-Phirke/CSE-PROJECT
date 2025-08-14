import React from 'react';
import { Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ACCENT_COLORS = [
  { name: 'Purple-Pink', value: 'purple-pink', from: 'from-purple-500', to: 'to-pink-500' },
  { name: 'Blue-Cyan', value: 'blue-cyan', from: 'from-blue-500', to: 'to-cyan-500' },
  { name: 'Green-Teal', value: 'green-teal', from: 'from-green-500', to: 'to-teal-500' },
  { name: 'Orange-Red', value: 'orange-red', from: 'from-orange-500', to: 'to-red-500' },
  { name: 'Indigo-Purple', value: 'indigo-purple', from: 'from-indigo-500', to: 'to-purple-500' },
] as const;

interface AccentCycleUIProps {
  className?: string;
}

export function AccentCycleUI({ className = '' }: AccentCycleUIProps) {
  const { accentColor, cycleAccent } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  const currentAccent = ACCENT_COLORS.find(accent => accent.value === accentColor) || ACCENT_COLORS[0];

  const handleAccentChange = (newAccent: string) => {
    cycleAccent(newAccent);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent, accent: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleAccentChange(accent);
    }
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Floating Action Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            group flex h-14 w-14 items-center justify-center rounded-full 
            bg-gradient-to-r ${currentAccent.from} ${currentAccent.to}
            shadow-lg hover:shadow-xl dark:shadow-2xl
            transition-all duration-300 ease-out
            hover:scale-110 active:scale-95
            focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 
            focus:ring-offset-transparent
          `}
          aria-label="Change accent color"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Palette 
            className={`h-6 w-6 text-white transition-transform duration-300 ${
              isOpen ? 'rotate-180' : 'group-hover:rotate-12'
            }`} 
          />
        </button>

        {/* Color Palette */}
        {isOpen && (
          <div
            className="
              absolute bottom-16 right-0 mb-2
              backdrop-blur-xl bg-white/80 dark:bg-gray-900/80
              border border-white/20 dark:border-gray-700/50
              rounded-2xl shadow-2xl
              p-3 min-w-[200px]
              animate-in slide-in-from-bottom-5 fade-in-0 duration-200
            "
            role="menu"
            aria-label="Accent color options"
          >
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 px-2 pb-1 border-b border-gray-200/50 dark:border-gray-700/50">
                Accent Colors
              </div>
              
              {ACCENT_COLORS.map((accent) => (
                <button
                  key={accent.value}
                  onClick={() => handleAccentChange(accent.value)}
                  onKeyDown={(e) => handleKeyDown(e, accent.value)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-200
                    hover:bg-gray-100/50 dark:hover:bg-gray-800/50
                    focus:outline-none focus:ring-2 focus:ring-gray-400/50
                    ${accentColor === accent.value ? 'bg-gray-100/70 dark:bg-gray-800/70' : ''}
                  `}
                  role="menuitem"
                  aria-label={`Set accent to ${accent.name}`}
                >
                  {/* Color Preview */}
                  <div 
                    className={`
                      h-5 w-5 rounded-full bg-gradient-to-r ${accent.from} ${accent.to}
                      shadow-sm ring-1 ring-black/5 dark:ring-white/10
                    `}
                  />
                  
                  {/* Color Name */}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 text-left">
                    {accent.name}
                  </span>
                  
                  {/* Active Indicator */}
                  {accentColor === accent.value && (
                    <div className="h-2 w-2 rounded-full bg-gray-600 dark:bg-gray-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
