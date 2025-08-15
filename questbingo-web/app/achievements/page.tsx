"use client";

import { useEffect, useState } from "react";

type Ach = { id: string; title: string; at: string };

export default function AchievementsPage() {
  const [nickname, setNickname] = useState<string>("");
  const [achievements, setAchievements] = useState<Ach[]>([]);

  useEffect(() => {
    const n = window.localStorage.getItem("questbingo.nickname") || "";
    setNickname(n);
    if (n) reload(n);
  }, []);

  const reload = async (n: string) => {
    const r = await fetch(`/api/wallet?playerId=${encodeURIComponent(n)}`);
    const d = await r.json();
    setAchievements(d.wallet?.achievements ?? []);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Achievements</h1>
      {!nickname && <div className="text-sm opacity-70 mb-2">Set nickname on Home first.</div>}
      <ul className="text-sm divide-y divide-black/10 dark:divide-white/10 rounded-md border">
        {achievements.map((a) => (
          <li key={a.id} className="p-3 flex items-center justify-between">
            <div className="font-medium">{a.title}</div>
            <div className="text-xs opacity-60">{new Date(a.at).toLocaleString()}</div>
          </li>
        ))}
        {achievements.length === 0 && (
          <li className="p-3 text-xs opacity-60">No achievements yet.</li>
        )}
      </ul>
    </div>
  );
}