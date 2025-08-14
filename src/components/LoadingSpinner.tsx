import React from 'react';

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-[#0d0d10] dark:via-[#12121a] dark:to-[#1b1322]">
      <div className="relative p-10 rounded-3xl border border-white/20 bg-white/70 dark:bg-white/5 backdrop-blur-2xl shadow-inner-glow">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-white/40 dark:border-white/10" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-500 border-r-purple-500 animate-spin" />
        </div>
        <p className="mt-6 text-sm font-medium tracking-wide bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent animate-pulse-soft">Loading</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;