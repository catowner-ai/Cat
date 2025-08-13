import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Achievement = { id: string; title: string; at: string };

type PlayerWallet = {
  coins: number;
  cosmetics: string[];
  equipped?: string;
  achievements: Achievement[];
};

type Store = { players: Record<string, PlayerWallet> };

function filePath() { return path.join(process.cwd(), '.data', 'wallet.json'); }

async function ensure() { const p = filePath(); await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => {}); try { await fs.access(p); } catch { await fs.writeFile(p, JSON.stringify({ players: {} } as Store, null, 2)); } }
async function readStore(): Promise<Store> { await ensure(); const raw = await fs.readFile(filePath(), 'utf8'); try { return JSON.parse(raw) as Store; } catch { return { players: {} }; } }
async function writeStore(s: Store) { await ensure(); await fs.writeFile(filePath(), JSON.stringify(s, null, 2)); }

function getOrCreate(store: Store, playerId: string): PlayerWallet { return store.players[playerId] ?? (store.players[playerId] = { coins: 0, cosmetics: [], achievements: [] }); }

export async function GET(req: Request) {
  const url = new URL(req.url);
  const playerId = (url.searchParams.get('playerId') || '').slice(0, 64);
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 });
  const store = await readStore();
  const w = getOrCreate(store, playerId);
  return NextResponse.json({ ok: true, wallet: w });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as { action?: string; playerId?: string; coins?: number; cosmetic?: string; id?: string; title?: string }));
  const action = String(body.action || '').toLowerCase();
  const playerId = String(body.playerId || '').slice(0, 64);
  if (!playerId || !action) return NextResponse.json({ error: 'playerId and action required' }, { status: 400 });
  const store = await readStore();
  const w = getOrCreate(store, playerId);

  if (action === 'grant') {
    const coins = Number.isFinite(body.coins) ? Math.max(0, Math.floor(body.coins)) : 0;
    w.coins += coins;
  } else if (action === 'equip') {
    const cosmetic = String(body.cosmetic || '').slice(0, 64);
    if (w.cosmetics.includes(cosmetic)) w.equipped = cosmetic;
  } else if (action === 'achieve') {
    const id = String(body.id || '').slice(0, 64);
    const title = String(body.title || '').slice(0, 120);
    if (id && !w.achievements.find((a) => a.id === id)) w.achievements.push({ id, title, at: new Date().toISOString() });
  }

  await writeStore(store);
  return NextResponse.json({ ok: true, wallet: w });
}