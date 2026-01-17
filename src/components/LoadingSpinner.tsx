import React from 'react';

function LoadingSpinner(): JSX.Element {
  return (
    // fullscreen overlay but visually only the spinner will be visible
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
    >
      {/* Centered SVG gradient ring spinner */}
      <svg
        className="w-16 h-16 animate-spin-slow"
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        {/* Subtle track */}
        <circle cx="25" cy="25" r="20" strokeWidth="4" stroke="#11182720" fill="none" />
        {/* Animated arc */}
        <circle
          cx="25"
          cy="25"
          r="20"
          strokeWidth="4"
          stroke="url(#spinner-gradient)"
          strokeLinecap="round"
          strokeDasharray="31.4 94.2"
          fill="none"
        />
      </svg>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default LoadingSpinner;