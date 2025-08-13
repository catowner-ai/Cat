"use client";

import { useCallback } from 'react';

export function useConfetti() {
  return useCallback(async () => {
    try {
      const confetti = (await import('canvas-confetti')).default;
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 } });
    } catch {}
  }, []);
}