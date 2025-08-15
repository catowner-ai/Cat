"use client";

import { useEffect, useState } from 'react';

type Row = { playerId: string; lines: number; quests: number };

export default function QuestLeaderboards({ roomId }: { roomId: string }) {
  const [weekly, setWeekly] = useState<Row[]>([]);
  const [monthly, setMonthly] = useState<Row[]>([]);

  useEffect(() => {
    if (!roomId) return;
    (async () => {
      try {
        const r = await fetch(`/api/leaderboard/summary?room=${encodeURIComponent(roomId)}`, { cache: 'no-store' });
        const d = await r.json();
        setWeekly(d.weekly || []);
        setMonthly(d.monthly || []);
      } catch {}
    })();
  }, [roomId]);

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section>
        <div className="text-sm opacity-70 mb-2">Weekly Top (lines)</div>
        <ul className="text-sm space-y-1">
          {weekly.map((e, idx) => (
            <li key={e.playerId+idx} className="rounded-md border p-2 flex items-center justify-between">
              <div className="truncate">{idx+1}. {e.playerId}</div>
              <div className="opacity-70">{e.lines} lines · {e.quests} quests</div>
            </li>
          ))}
          {weekly.length === 0 && <li className="text-xs opacity-60">No entries yet.</li>}
        </ul>
      </section>
      <section>
        <div className="text-sm opacity-70 mb-2">Monthly Top (lines)</div>
        <ul className="text-sm space-y-1">
          {monthly.map((e, idx) => (
            <li key={e.playerId+idx} className="rounded-md border p-2 flex items-center justify-between">
              <div className="truncate">{idx+1}. {e.playerId}</div>
              <div className="opacity-70">{e.lines} lines · {e.quests} quests</div>
            </li>
          ))}
          {monthly.length === 0 && <li className="text-xs opacity-60">No entries yet.</li>}
        </ul>
      </section>
    </div>
  );
}