import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Entry = {
  playerId: string;
  lines: number;
  quests: number;
  updatedAt: string;
};

type DayRoomStore = {
  [roomId: string]: Entry[];
};

type Store = {
  [dayKey: string]: DayRoomStore | Entry[]; // keep legacy array for backward compatibility
};

function getDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function getStorePath() {
  return path.join(process.cwd(), '.data', 'leaderboard.json');
}

async function ensureDataFile() {
  const file = getStorePath();
  const dir = path.dirname(file);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify({} satisfies Store, null, 2));
  }
}

async function readStore(): Promise<Store> {
  await ensureDataFile();
  const raw = await fs.readFile(getStorePath(), 'utf8');
  try {
    return JSON.parse(raw) as Store;
  } catch {
    return {} as Store;
  }
}

async function writeStore(store: Store) {
  await ensureDataFile();
  await fs.writeFile(getStorePath(), JSON.stringify(store, null, 2));
}

function ensureRoom(store: Store, day: string, roomId: string): Entry[] {
  const dayData = store[day];
  if (!dayData) {
    const rooms: DayRoomStore = { [roomId]: [] };
    store[day] = rooms;
    return rooms[roomId]!;
  }
  if (Array.isArray(dayData)) {
    // migrate legacy array to room map under 'global'
    const rooms: DayRoomStore = { global: dayData };
    store[day] = rooms;
    rooms[roomId] = rooms[roomId] ?? [];
    return rooms[roomId]!;
  }
  const rooms = dayData as DayRoomStore;
  rooms[roomId] = rooms[roomId] ?? [];
  return rooms[roomId]!;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomId = (url.searchParams.get('room') || 'global').slice(0, 32);
  const day = getDayKey();
  const store = await readStore();
  const entries = ensureRoom(store, day, roomId).slice().sort((a, b) => b.lines - a.lines).slice(0, 20);
  return NextResponse.json({ day, room: roomId, entries });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const playerId = String(body.playerId || '').slice(0, 64);
  const roomId = String(body.roomId || 'global').slice(0, 32);
  const day = getDayKey();
  const lines = Number.isFinite(body.lines) ? Math.max(0, Math.floor(body.lines)) : undefined;
  const questsInc = Number.isFinite(body.questsInc) ? Math.max(0, Math.floor(body.questsInc)) : 0;
  if (!playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 });
  }
  const store = await readStore();
  const todaysRoom = ensureRoom(store, day, roomId);
  let entry = todaysRoom.find((e) => e.playerId === playerId);
  if (!entry) {
    entry = { playerId, lines: 0, quests: 0, updatedAt: new Date().toISOString() };
    todaysRoom.push(entry);
  }
  if (typeof lines === 'number') {
    entry.lines = Math.max(entry.lines, lines);
  }
  if (questsInc > 0) {
    entry.quests += questsInc;
  }
  entry.updatedAt = new Date().toISOString();
  await writeStore(store);
  try { const mod = await import('../_events'); (mod as { publish: (room: string, ev: unknown) => void }).publish(roomId, { type: 'leaderboard', roomId, playerId, lines: entry.lines, quests: entry.quests }); } catch {}
  return NextResponse.json({ ok: true, day, room: roomId, entry });
}