import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, duration = 1000, format = (n) => n.toString() }) => {
  const [display, setDisplay] = useState(0);
  const start = useRef<number | null>(null);
  const from = useRef(0);
  const target = useRef(value);

  useEffect(() => {
    from.current = display; // capture current display as starting point
    target.current = value;
    start.current = null;
    const step = (ts: number) => {
      if (start.current == null) start.current = ts;
      const progress = Math.min(1, (ts - start.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from.current + (target.current - from.current) * eased;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span>{format(Math.round(display))}</span>;
};
