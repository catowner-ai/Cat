import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Achievement = { key: string; label: string; icon: string; unlockedAt: string };

type Store = { [playerId: string]: Achievement[] };

function filePath() { return path.join(process.cwd(), '.data', 'achievements.json'); }

async function ensure() {
  const p = filePath();
  await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => {});
  try { await fs.access(p); } catch { await fs.writeFile(p, JSON.stringify({}, null, 2)); }
}

async function readStore(): Promise<Store> {
  await ensure();
  const raw = await fs.readFile(filePath(), 'utf8');
  try { return JSON.parse(raw) as Store; } catch { return {}; }
}

async function writeStore(s: Store) { await ensure(); await fs.writeFile(filePath(), JSON.stringify(s, null, 2)); }

export async function GET(req: Request) {
  const url = new URL(req.url);
  const playerId = (url.searchParams.get('playerId') || '').slice(0, 64);
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 });
  const store = await readStore();
  const list = store[playerId] ?? [];
  return NextResponse.json({ ok: true, achievements: list });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const playerId = String(body.playerId || '').slice(0, 64);
  const key = String(body.key || '').slice(0, 64);
  const label = String(body.label || '').slice(0, 64) || key;
  const icon = String(body.icon || '🏅').slice(0, 8);
  if (!playerId || !key) return NextResponse.json({ error: 'playerId and key required' }, { status: 400 });
  const store = await readStore();
  const list = store[playerId] ?? (store[playerId] = []);
  if (!list.find((a) => a.key === key)) {
    list.push({ key, label, icon, unlockedAt: new Date().toISOString() });
    await writeStore(store);
  }
  return NextResponse.json({ ok: true, achievements: list });
}