import { NextResponse } from 'next/server';
import { addClient, removeClient } from '../_events';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomId = (url.searchParams.get('room') || 'global').slice(0, 32);
  const playerId = (url.searchParams.get('playerId') || '').slice(0, 64);

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Initial headers for SSE
  writer.write(new TextEncoder().encode(`retry: 5000\n\n`));
  addClient(roomId, writer, playerId);

  const heartbeat = setInterval(() => {
    try { writer.write(new TextEncoder().encode(`:hb\n\n`)); } catch {}
  }, 15000);

  const response = new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });

  (response as any).headers?.set?.('X-Accel-Buffering', 'no');

  (response as any).onclose = () => {
    clearInterval(heartbeat);
    removeClient(roomId, writer);
    writer.close();
  };

  return response;
}