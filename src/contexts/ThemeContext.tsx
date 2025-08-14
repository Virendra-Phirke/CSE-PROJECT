import React, { createContext, useEffect, useState, useCallback } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  accent: string; // legacy name
  accentColor: string; // alias for clarity
  cycleAccent: (newAccent?: string) => void;
  setAccent: (accent: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
export { ThemeContext };

const ACCENTS = ['purple-pink', 'blue-cyan', 'green-teal', 'orange-red', 'indigo-purple'];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => (localStorage.getItem('theme') === 'light' ? false : true));
  const [accent, setAccent] = useState(() => localStorage.getItem('accent') || 'purple-pink');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    localStorage.setItem('accent', accent);
  }, [accent]);

  const toggleTheme = () => setIsDark(d => !d);
  const setTheme = (theme: 'light' | 'dark') => setIsDark(theme === 'dark');

  const cycleAccent = useCallback((newAccent?: string) => {
    if (newAccent && ACCENTS.includes(newAccent)) {
      setAccent(newAccent);
      return;
    }
    setAccent(prev => ACCENTS[(ACCENTS.indexOf(prev) + 1) % ACCENTS.length]);
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme, accent, accentColor: accent, cycleAccent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}
