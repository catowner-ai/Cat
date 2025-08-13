import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Room = { players: Map<string, number> };
const rooms: Map<string, Room> = new Map();

function now() { return Date.now(); }
function getRoom(roomId: string): Room { let r = rooms.get(roomId); if (!r) { r = { players: new Map() }; rooms.set(roomId, r); } return r; }
function cleanup(room: Room) { const cutoff = now() - 30_000; for (const [p, ts] of room.players) { if (ts < cutoff) room.players.delete(p); } }

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomId = (url.searchParams.get('room') || 'global').slice(0, 32);
  const room = getRoom(roomId);
  cleanup(room);
  return NextResponse.json({ ok: true, room: roomId, count: room.players.size, players: Array.from(room.players.keys()) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const roomId = String(body.roomId || 'global').slice(0, 32);
  const playerId = String(body.playerId || '').slice(0, 64);
  const action = String(body.action || 'heartbeat');
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 });
  const room = getRoom(roomId);
  if (action === 'join' || action === 'heartbeat') {
    room.players.set(playerId, now());
  } else if (action === 'leave') {
    room.players.delete(playerId);
  }
  cleanup(room);
  return NextResponse.json({ ok: true, room: roomId, count: room.players.size });
}