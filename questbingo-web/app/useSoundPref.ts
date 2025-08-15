"use client";

import { useEffect, useState, useCallback } from 'react';

export function useSoundPref() {
  const [muted, setMuted] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('questbingo.muted');
    setMuted(saved === '1');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('questbingo.muted', muted ? '1' : '0');
  }, [muted]);

  const toggle = useCallback(() => setMuted((m) => !m), []);

  return { muted, setMuted, toggle } as const;
}