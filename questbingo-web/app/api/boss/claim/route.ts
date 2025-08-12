import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Entry = { playerId: string; lines: number; quests: number; updatedAt: string };

type DayRoomStore = { [roomId: string]: Entry[] };

type LeaderboardStore = { [dayKey: string]: DayRoomStore | Entry[] };

type SnapswapStore = { rooms: Record<string, { completed?: Record<string, string> }> };

type ClaimedStore = { [dayKey: string]: Record<string, boolean> };

function dayKey(d = new Date()) { return d.toISOString().slice(0, 10); }

async function readJSON<T>(p: string, fallback: T): Promise<T> {
  try { const raw = await fs.readFile(p, 'utf8'); return JSON.parse(raw) as T; } catch { return fallback; }
}

async function ensureDir(p: string) { await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => {}); }

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as { playerId?: string; roomId?: string; bossId?: string }));
  const playerId = String(body.playerId || '').slice(0, 64);
  const roomId = String(body.roomId || 'global').slice(0, 32);
  const bossId = String(body.bossId || '');
  if (!playerId || !bossId) return NextResponse.json({ error: 'playerId and bossId required' }, { status: 400 });

  const day = dayKey();
  const claimPath = path.join(process.cwd(), '.data', 'boss-claimed.json');
  await ensureDir(claimPath);
  const claimed = await readJSON<ClaimedStore>(claimPath, {} as ClaimedStore);
  if (claimed[day]?.[playerId]) return NextResponse.json({ ok: false, reason: 'already_claimed' }, { status: 400 });

  // Boss rotation identical to /api/boss
  const bosses = [
    { id: 'lines2', type: 'lines' as const, threshold: 2, rewardXp: 25, rewardHappy: 8 },
    { id: 'lines3', type: 'lines' as const, threshold: 3, rewardXp: 50, rewardHappy: 12 },
    { id: 'match1', type: 'match' as const, threshold: 1, rewardXp: 40, rewardHappy: 10 },
  ];
  const idx = Math.floor((Date.now() - new Date(new Date().getUTCFullYear(), 0, 1).getTime()) / (1000*60*60*24)) % bosses.length;
  const boss = bosses[idx];
  if (boss.id !== bossId) return NextResponse.json({ ok: false, reason: 'boss_mismatch' }, { status: 400 });

  let ok = false;
  if (boss.type === 'lines') {
    const lbPath = path.join(process.cwd(), '.data', 'leaderboard.json');
    const lb = await readJSON<LeaderboardStore>(lbPath, {} as LeaderboardStore);
    const dayData = lb[day];
    let entries: Entry[] = [];
    if (Array.isArray(dayData)) entries = dayData as Entry[];
    else entries = ((dayData as DayRoomStore)?.[roomId] ?? []) as Entry[];
    const me = entries.find((e) => e.playerId === playerId);
    ok = !!(me && me.lines >= boss.threshold);
  } else if (boss.type === 'match') {
    const ssPath = path.join(process.cwd(), '.data', 'snapswap-v2.json');
    const ss = await readJSON<SnapswapStore>(ssPath, { rooms: {} });
    const completedDay = ss.rooms[roomId]?.completed?.[playerId];
    ok = completedDay === day;
  }

  if (!ok) return NextResponse.json({ ok: false, reason: 'not_met' }, { status: 400 });

  // Mark claimed
  claimed[day] = claimed[day] || {};
  claimed[day]![playerId] = true;
  await fs.writeFile(claimPath, JSON.stringify(claimed, null, 2));

  // Grant pet rewards
  await fetch('http://localhost:3000/api/pet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId, action: 'grant', xp: boss.rewardXp, happiness: boss.rewardHappy }) }).catch(() => {});

  return NextResponse.json({ ok: true, rewards: { xp: boss.rewardXp, happiness: boss.rewardHappy } });
}