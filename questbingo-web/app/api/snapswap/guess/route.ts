import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Offer = { id: string; playerId: string; image: string; createdAt: string };

type Room = {
  offers: Offer[];
  matches: Record<string, Offer>;
  completed?: Record<string, string>; // playerId -> dayKey
};

type Store = {
  rooms: Record<string, Room>;
};

function filePath() { return path.join(process.cwd(), '.data', 'snapswap-v2.json'); }
async function ensure() { const p = filePath(); await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => {}); try { await fs.access(p); } catch { await fs.writeFile(p, JSON.stringify({ rooms: {} } as Store, null, 2)); } }
async function readStore(): Promise<Store> { await ensure(); const raw = await fs.readFile(filePath(), 'utf8'); try { return JSON.parse(raw) as Store; } catch { return { rooms: {} }; } }
async function writeStore(data: Store) { await ensure(); await fs.writeFile(filePath(), JSON.stringify(data, null, 2)); }
function dayKey(d = new Date()) { return d.toISOString().slice(0,10); }

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const playerId = String(body.playerId || '').slice(0, 64);
  const roomId = String(body.roomId || 'global').slice(0, 32);
  const guess = String(body.guess || '').trim().toLowerCase();
  if (!playerId || !guess) return NextResponse.json({ error: 'playerId and guess required' }, { status: 400 });
  const store = await readStore();
  const room: Room = store.rooms[roomId] ?? { offers: [], matches: {}, completed: {} };
  const partnerOffer = room.matches[playerId];
  if (!partnerOffer) return NextResponse.json({ ok: false, reason: 'no_match' }, { status: 400 });
  const correct = partnerOffer.playerId.toLowerCase() === guess;
  if (correct) {
    delete room.matches[playerId];
    room.completed = room.completed || {};
    room.completed[playerId] = dayKey();
    store.rooms[roomId] = room;
    await writeStore(store);
    try { const mod = await import('../../_events'); (mod as { publish: (room: string, ev: unknown) => void }).publish(roomId, { type: 'reveal', roomId, playerId, partnerId: partnerOffer.playerId }); } catch {}
    try {
      await fetch('http://localhost:3000/api/wallet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'achieve', playerId, id: 'first_guess', title: 'Sharp Eye!' }) });
      await fetch('http://localhost:3000/api/wallet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'grant', playerId, coins: 15 }) });
    } catch {}
    return NextResponse.json({ ok: true, correct: true, partner: { playerId: partnerOffer.playerId } });
  }
  return NextResponse.json({ ok: true, correct: false });
}