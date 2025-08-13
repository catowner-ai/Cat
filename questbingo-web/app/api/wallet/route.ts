import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Achievement = { id: string; title: string; at: string };

type PlayerWallet = {
  coins: number;
  cosmetics: string[];
  stickersOwned: string[];
  equipped?: string;
  achievements: Achievement[];
};

type Store = { players: Record<string, PlayerWallet> };

function filePath() { return path.join(process.cwd(), '.data', 'wallet.json'); }

async function ensure() { const p = filePath(); await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => {}); try { await fs.access(p); } catch { await fs.writeFile(p, JSON.stringify({ players: {} } as Store, null, 2)); } }
async function readStore(): Promise<Store> { await ensure(); const raw = await fs.readFile(filePath(), 'utf8'); try { return JSON.parse(raw) as Store; } catch { return { players: {} }; } }
async function writeStore(s: Store) { await ensure(); await fs.writeFile(filePath(), JSON.stringify(s, null, 2)); }

function getOrCreate(store: Store, playerId: string): PlayerWallet { return store.players[playerId] ?? (store.players[playerId] = { coins: 0, cosmetics: [], stickersOwned: [], achievements: [] }); }

const PRICE: Record<string, number> = {
  'cosmetic:glow': 50,
  'cosmetic:sparkle': 80,
  'cosmetic:shadow': 60,
  'cosmetic:rainbow': 120,
  'sticker:hi': 10,
  'sticker:gg': 10,
  'sticker:lul': 10,
  'sticker:wow': 15,
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const playerId = (url.searchParams.get('playerId') || '').slice(0, 64);
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 });
  const store = await readStore();
  const w = getOrCreate(store, playerId);
  return NextResponse.json({ ok: true, wallet: w });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as { action?: string; playerId?: string; coins?: number; cosmetic?: string; id?: string; title?: string; kind?: string; itemId?: string }));
  const action = String(body.action || '').toLowerCase();
  const playerId = String(body.playerId || '').slice(0, 64);
  if (!playerId || !action) return NextResponse.json({ error: 'playerId and action required' }, { status: 400 });
  const store = await readStore();
  const w = getOrCreate(store, playerId);

  if (action === 'grant') {
    const coins = Number.isFinite(body.coins) ? Math.floor(Number(body.coins)) : 0;
    w.coins += coins;
  } else if (action === 'equip') {
    const cosmetic = String(body.cosmetic || '').slice(0, 64);
    if (w.cosmetics.includes(cosmetic)) w.equipped = cosmetic;
  } else if (action === 'achieve') {
    const id = String(body.id || '').slice(0, 64);
    const title = String(body.title || '').slice(0, 120);
    if (id && !w.achievements.find((a) => a.id === id)) w.achievements.push({ id, title, at: new Date().toISOString() });
  } else if (action === 'buy') {
    const kind = String(body.kind || '').toLowerCase();
    const itemId = String(body.itemId || '').toLowerCase();
    const key = `${kind}:${itemId}`;
    const price = PRICE[key];
    if (!price || w.coins < price) return NextResponse.json({ ok: false, reason: 'insufficient' }, { status: 400 });
    w.coins -= price;
    if (kind === 'cosmetic') {
      if (!w.cosmetics.includes(itemId)) w.cosmetics.push(itemId);
    } else if (kind === 'sticker') {
      if (!w.stickersOwned.includes(itemId)) w.stickersOwned.push(itemId);
    }
  }

  await writeStore(store);
  return NextResponse.json({ ok: true, wallet: w });
}