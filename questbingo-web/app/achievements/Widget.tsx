"use client";

import { useEffect, useState } from 'react';

type Achievement = { key: string; label: string; icon: string; unlockedAt: string };

export default function AchievementsWidget({ playerId }: { playerId: string }) {
  const [list, setList] = useState<Achievement[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    (async () => {
      try {
        const r = await fetch(`/api/achievements?playerId=${encodeURIComponent(playerId)}`, { cache: 'no-store' });
        const d = await r.json();
        setList(d.achievements || []);
      } catch {}
    })();
  }, [playerId]);

  if (!playerId) return null;

  return (
    <div className="relative">
      <button className="px-3 py-1.5 rounded-full border text-xs" onClick={() => setOpen((o) => !o)}>
        🏅 {list.length}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 p-3 z-10">
          <div className="text-sm font-medium mb-2">Achievements</div>
          <ul className="space-y-1 text-sm max-h-56 overflow-auto">
            {list.map((a) => (
              <li key={a.key} className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>{a.icon}</span>
                <span className="truncate">{a.label}</span>
              </li>
            ))}
            {list.length === 0 && <li className="text-xs opacity-60">No badges yet — play to unlock!</li>}
          </ul>
        </div>
      )}
    </div>
  );
}