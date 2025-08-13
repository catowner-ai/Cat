import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Room = { clients: Set<WritableStreamDefaultWriter>; players: Set<string> };
const rooms: Map<string, Room> = new Map();

function getRoom(roomId: string): Room {
  let r = rooms.get(roomId);
  if (!r) { r = { clients: new Set(), players: new Set() }; rooms.set(roomId, r); }
  return r;
}

function broadcast(roomId: string) {
  const room = getRoom(roomId);
  const payload = `data: ${JSON.stringify({ room: roomId, count: room.players.size, players: Array.from(room.players) })}\n\n`;
  for (const client of room.clients) {
    client.write(payload).catch(() => {});
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomId = (url.searchParams.get('room') || 'global').slice(0, 32);
  const playerId = (url.searchParams.get('playerId') || '').slice(0, 64);
  const room = getRoom(roomId);

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  room.clients.add(writer);
  if (playerId) room.players.add(playerId);
  // initial push
  writer.write(`event: hello\n` + `data: ${JSON.stringify({ room: roomId })}\n\n`).catch(() => {});
  broadcast(roomId);

  const interval = setInterval(() => broadcast(roomId), 10_000);

  const stream = new ReadableStream({
    start(controller) {
      // Pipe the readable to controller
      const reader = readable.getReader();
      function pump() {
        reader.read().then(({ done, value }) => {
          if (done) { controller.close(); return; }
          controller.enqueue(value);
          pump();
        }).catch(() => controller.close());
      }
      pump();
    },
    cancel() {
      clearInterval(interval);
      room.clients.delete(writer);
      if (playerId) room.players.delete(playerId);
      broadcast(roomId);
    }
  });

  return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
}