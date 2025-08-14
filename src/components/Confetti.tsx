import React, { useEffect } from 'react';
import { fireConfetti } from '../lib/confetti';

const ConfettiOnMount: React.FC = () => {
  useEffect(() => {
    fireConfetti();
  }, []);
  return null;
};

export default ConfettiOnMount;
