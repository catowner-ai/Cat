import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Entry = { playerId: string; lines: number; quests: number; updatedAt: string };

type DayRoomStore = { [roomId: string]: Entry[] };

type Store = { [dayKey: string]: DayRoomStore | Entry[] };

function storePath() { return path.join(process.cwd(), '.data', 'leaderboard.json'); }

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(storePath(), 'utf8');
    return JSON.parse(raw) as Store;
  } catch {
    return {} as Store;
  }
}

function parseDayKey(key: string): Date | null {
  // Expect YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const d = new Date(key + 'T00:00:00Z');
  return Number.isNaN(+d) ? null : d;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((+a - +b) / (1000 * 60 * 60 * 24));
}

function accumulate(entries: Entry[]): Record<string, { playerId: string; lines: number; quests: number }> {
  const acc: Record<string, { playerId: string; lines: number; quests: number }> = {};
  for (const e of entries) {
    const k = e.playerId;
    const cur = acc[k] || { playerId: k, lines: 0, quests: 0 };
    cur.lines += Math.max(0, e.lines | 0);
    cur.quests += Math.max(0, e.quests | 0);
    acc[k] = cur;
  }
  return acc;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomId = (url.searchParams.get('room') || 'global').slice(0, 32);
  const now = new Date();
  const store = await readStore();

  const weekly: Entry[] = [];
  const monthly: Entry[] = [];

  for (const [dayKey, data] of Object.entries(store)) {
    const d = parseDayKey(dayKey);
    if (!d) continue;
    const ago = daysBetween(now, d);
    if (ago < 0) continue;
    let list: Entry[] = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === 'object') {
      const roomMap = data as DayRoomStore;
      list = roomMap[roomId] || [];
    }
    if (ago <= 6) weekly.push(...list);
    if (ago <= 29) monthly.push(...list);
  }

  const weeklyAcc = Object.values(accumulate(weekly)).sort((a, b) => b.lines - a.lines).slice(0, 20);
  const monthlyAcc = Object.values(accumulate(monthly)).sort((a, b) => b.lines - a.lines).slice(0, 20);

  return NextResponse.json({ ok: true, room: roomId, weekly: weeklyAcc, monthly: monthlyAcc });
}