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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const playerId = (url.searchParams.get('playerId') || '').slice(0, 64);
  const roomId = (url.searchParams.get('roomId') || 'global').slice(0, 32);
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 });

  // Boss rotation
  const bosses = [
    { id: 'lines2', type: 'lines' as const, threshold: 2 },
    { id: 'lines3', type: 'lines' as const, threshold: 3 },
    { id: 'match1', type: 'match' as const, threshold: 1 },
  ];
  const idx = Math.floor((Date.now() - new Date(new Date().getUTCFullYear(), 0, 1).getTime()) / (1000*60*60*24)) % bosses.length;
  const boss = bosses[idx];

  const day = dayKey();
  const claimPath = path.join(process.cwd(), '.data', 'boss-claimed.json');
  const claimed = await readJSON<ClaimedStore>(claimPath, {});
  const already = !!claimed?.[day]?.[playerId];

  let progress = 0;
  let ready = false;

  if (boss.type === 'lines') {
    const lbPath = path.join(process.cwd(), '.data', 'leaderboard.json');
    const lb = await readJSON<LeaderboardStore>(lbPath, {} as LeaderboardStore);
    const dayData = lb[day];
    let entries: Entry[] = [];
    if (Array.isArray(dayData)) entries = dayData as Entry[];
    else entries = ((dayData as DayRoomStore)?.[roomId] ?? []) as Entry[];
    const me = entries.find((e) => e.playerId === playerId);
    progress = me?.lines ?? 0;
    ready = progress >= boss.threshold;
  } else {
    const ssPath = path.join(process.cwd(), '.data', 'snapswap-v2.json');
    const ss = await readJSON<SnapswapStore>(ssPath, { rooms: {} });
    const completedDay = ss.rooms[roomId]?.completed?.[playerId];
    progress = completedDay === day ? 1 : 0;
    ready = progress >= boss.threshold;
  }

  return NextResponse.json({ boss, already, progress, ready });
}