import confetti from 'canvas-confetti';

export const fireConfetti = (options?: Partial<Parameters<typeof confetti>[0]>) => {
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#a855f7', '#ec4899', '#38bdf8', '#f59e42', '#22d3ee'],
    scalar: 1.2,
    zIndex: 9999,
    disableForReducedMotion: true,
    ...(options || {})
  });
};
