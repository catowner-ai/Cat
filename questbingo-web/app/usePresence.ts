"use client";

import { useEffect, useState } from 'react';

export type PresenceState = { count: number; players: string[] };

export function usePresence(roomId: string, playerId: string) {
  const [state, setState] = useState<PresenceState>({ count: 0, players: [] });

  useEffect(() => {
    if (!roomId) return;
    let closed = false;
    let es: EventSource | null = null;

    try {
      es = new EventSource(`/api/presence/stream?room=${encodeURIComponent(roomId)}&playerId=${encodeURIComponent(playerId || 'guest')}`);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || '{}');
          if (!closed) setState({ count: data.count ?? 0, players: data.players ?? [] });
        } catch {}
      };
      es.onerror = () => {
        es?.close();
        es = null;
      };
    } catch {}

    const poll = async () => {
      try {
        const res = await fetch(`/api/presence?room=${encodeURIComponent(roomId)}`, { cache: 'no-store' });
        const d = await res.json();
        if (!closed) setState({ count: d.count ?? 0, players: d.players ?? [] });
      } catch {}
    };

    const iv = setInterval(poll, 20000);
    poll();

    return () => {
      closed = true;
      clearInterval(iv);
      es?.close();
    };
  }, [roomId, playerId]);

  return state;
}