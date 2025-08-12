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

type Store = {
  [dayKey: string]: Entry[];
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

export async function GET() {
  const day = getDayKey();
  const store = await readStore();
  const entries = (store[day] ?? []).slice().sort((a, b) => b.lines - a.lines).slice(0, 20);
  return NextResponse.json({ day, entries });
}

export async function POST(req: Request) {
  const day = getDayKey();
  const body = await req.json().catch(() => ({}));
  const playerId = String(body.playerId || '').slice(0, 64);
  const lines = Number.isFinite(body.lines) ? Math.max(0, Math.floor(body.lines)) : undefined;
  const questsInc = Number.isFinite(body.questsInc) ? Math.max(0, Math.floor(body.questsInc)) : 0;
  if (!playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 });
  }
  const store = await readStore();
  const todays = store[day] ?? [];
  let entry = todays.find((e) => e.playerId === playerId);
  if (!entry) {
    entry = { playerId, lines: 0, quests: 0, updatedAt: new Date().toISOString() };
    todays.push(entry);
  }
  if (typeof lines === 'number') {
    entry.lines = Math.max(entry.lines, lines);
  }
  if (questsInc > 0) {
    entry.quests += questsInc;
  }
  entry.updatedAt = new Date().toISOString();
  store[day] = todays;
  await writeStore(store);
  return NextResponse.json({ ok: true, day, entry });
}