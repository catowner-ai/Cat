"use client";

import { useCallback, useRef } from 'react';

import { useSoundPref } from './useSoundPref';

export function useBeep() {
  const ctxRef = useRef<AudioContext | null>(null);
  const getCtx = () => {
    if (ctxRef.current) return ctxRef.current;
    const AnyWindow = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const CtxCtor = AnyWindow.AudioContext || AnyWindow.webkitAudioContext;
    if (!CtxCtor) throw new Error('AudioContext not supported');
    ctxRef.current = new CtxCtor();
    return ctxRef.current;
  };
  const { muted } = useSoundPref();
  return useCallback((freq = 880, durationMs = 90) => {
    if (muted) return;
    try {
      const ctx = getCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.value = freq;
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
      o.start(now);
      o.stop(now + durationMs / 1000);
    } catch {}
  }, []);
}