import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Swap = { id: string; playerId: string; image: string; createdAt: string };

type Store = {
  pool: Swap[];
};

function getStorePath() {
  return path.join(process.cwd(), '.data', 'snapswap.json');
}

async function ensure() {
  const file = getStorePath();
  const dir = path.dirname(file);
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
  try { await fs.access(file); } catch { await fs.writeFile(file, JSON.stringify({ pool: [] } satisfies Store, null, 2)); }
}

async function readStore(): Promise<Store> {
  await ensure();
  const raw = await fs.readFile(getStorePath(), 'utf8');
  try { return JSON.parse(raw) as Store; } catch { return { pool: [] }; }
}

async function writeStore(data: Store) {
  await ensure();
  await fs.writeFile(getStorePath(), JSON.stringify(data, null, 2));
}

export async function GET() {
  const store = await readStore();
  // Return a random peer image (if any)
  const pool = store.pool;
  if (pool.length === 0) return NextResponse.json({ ok: true, peer: null });
  const rnd = Math.floor(Math.random() * pool.length);
  const { id, playerId, image, createdAt } = pool[rnd];
  return NextResponse.json({ ok: true, peer: { id, playerId, image, createdAt } });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const playerId = String(body.playerId || '').slice(0, 64);
  const image = String(body.image || '').slice(0, 2048);
  if (!playerId || !image) return NextResponse.json({ error: 'playerId and image required' }, { status: 400 });
  const store = await readStore();
  const swap: Swap = { id: Math.random().toString(36).slice(2), playerId, image, createdAt: new Date().toISOString() };
  store.pool.push(swap);
  await writeStore(store);
  return NextResponse.json({ ok: true, id: swap.id });
}