import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Offer = { id: string; playerId: string; image: string; createdAt: string };

type Room = {
  offers: Offer[];
  matches: Record<string, Offer>;
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const playerId = (url.searchParams.get('playerId') || '').slice(0, 64);
  const roomId = (url.searchParams.get('roomId') || 'global').slice(0, 32);
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 });

  const store = await readStore();
  const room = store.rooms[roomId];
  if (!room) return NextResponse.json({ ok: true, ready: false });
  const partnerOffer = room.matches[playerId];
  if (!partnerOffer) return NextResponse.json({ ok: true, ready: false });

  // One-time retrieval then clear
  delete room.matches[playerId];
  await writeStore(store);
  return NextResponse.json({ ok: true, ready: true, partner: { image: partnerOffer.image, playerId: partnerOffer.playerId } });
}