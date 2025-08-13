import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Offer = { id: string; playerId: string; image: string; createdAt: string };

type Room = {
  offers: Offer[];
  matches: Record<string, Offer>; // playerId -> partner's offer
};

type Store = {
  rooms: Record<string, Room>;
};

function filePath() {
  return path.join(process.cwd(), '.data', 'snapswap-v2.json');
}

async function ensure() {
  const p = filePath();
  await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => {});
  try { await fs.access(p); } catch { await fs.writeFile(p, JSON.stringify({ rooms: {} } satisfies Store, null, 2)); }
}

async function readStore(): Promise<Store> {
  await ensure();
  const raw = await fs.readFile(filePath(), 'utf8');
  try { return JSON.parse(raw) as Store; } catch { return { rooms: {} }; }
}

async function writeStore(data: Store) {
  await ensure();
  await fs.writeFile(filePath(), JSON.stringify(data, null, 2));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const playerId = String(body.playerId || '').slice(0, 64);
  const roomId = String(body.roomId || 'global').slice(0, 32);
  const image = String(body.image || '').slice(0, 2048);
  if (!playerId || !image) return NextResponse.json({ error: 'playerId and image required' }, { status: 400 });

  const store = await readStore();
  const room: Room = store.rooms[roomId] ?? { offers: [], matches: {} };

  // prune offers older than 12h
  const now = Date.now();
  room.offers = room.offers.filter((o) => now - new Date(o.createdAt).getTime() < 12 * 60 * 60 * 1000);

  // If already matched, reject to avoid double-play
  if (room.matches[playerId]) {
    return NextResponse.json({ ok: false, reason: 'already_matched' }, { status: 400 });
  }

  // Try to find another player's offer to pair
  const idx = room.offers.findIndex((o) => o.playerId !== playerId);
  if (idx >= 0) {
    const partner = room.offers.splice(idx, 1)[0];
    const mine: Offer = { id: Math.random().toString(36).slice(2), playerId, image, createdAt: new Date().toISOString() };
    // Create matches for both sides
    room.matches[playerId] = partner;
    room.matches[partner.playerId] = mine;
    store.rooms[roomId] = room;
    await writeStore(store);
    try { const mod = await import('../../_events'); (mod as { publish: (room: string, ev: unknown) => void }).publish(roomId, { type: 'match', roomId, players: [playerId, partner.playerId] }); } catch {}
    return NextResponse.json({ ok: true, matched: true });
  }

  // Otherwise, queue my offer
  const offer: Offer = { id: Math.random().toString(36).slice(2), playerId, image, createdAt: new Date().toISOString() };
  room.offers.push(offer);
  store.rooms[roomId] = room;
  await writeStore(store);
  return NextResponse.json({ ok: true, matched: false });
}