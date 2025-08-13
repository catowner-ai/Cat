import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Message = { id: string; playerId: string; text?: string; stickerId?: string; createdAt: string };

type Store = { rooms: Record<string, Message[]> };

function filePath() { return path.join(process.cwd(), '.data', 'chat.json'); }

async function ensure() {
  const p = filePath();
  await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => {});
  try { await fs.access(p); } catch { await fs.writeFile(p, JSON.stringify({ rooms: {} } as Store, null, 2)); }
}

async function readStore(): Promise<Store> {
  await ensure();
  const raw = await fs.readFile(filePath(), 'utf8');
  try { return JSON.parse(raw) as Store; } catch { return { rooms: {} }; }
}

async function writeStore(s: Store) { await ensure(); await fs.writeFile(filePath(), JSON.stringify(s, null, 2)); }

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomId = (url.searchParams.get('room') || 'global').slice(0, 32);
  const store = await readStore();
  const list = (store.rooms[roomId] ?? []).slice(-50);
  return NextResponse.json({ room: roomId, messages: list });
}

async function ownsSticker(playerId: string, stickerId: string): Promise<boolean> {
  try {
    const mod = (await import('../wallet/route')) as unknown as { readStore?: () => Promise<{ players: Record<string, { stickersOwned?: string[] }> }> };
    const store = await mod.readStore?.();
    if (!store) return true; // fallback allow
    const w = store.players?.[playerId];
    return !!w?.stickersOwned?.includes(stickerId);
  } catch { return true; }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as { roomId?: string; playerId?: string; text?: string; stickerId?: string }));
  const roomId = String(body.roomId || 'global').slice(0, 32);
  const playerId = String(body.playerId || '').slice(0, 64);
  const text = body.text ? String(body.text).slice(0, 500) : undefined;
  const stickerId = body.stickerId ? String(body.stickerId).slice(0, 64) : undefined;
  if (!playerId || (!text && !stickerId)) return NextResponse.json({ error: 'playerId and text or stickerId required' }, { status: 400 });
  if (stickerId && !(await ownsSticker(playerId, stickerId))) return NextResponse.json({ error: 'not_owned' }, { status: 403 });
  const store = await readStore();
  const list = store.rooms[roomId] ?? [];
  const msg: Message = { id: Math.random().toString(36).slice(2), playerId, text, stickerId, createdAt: new Date().toISOString() };
  list.push(msg);
  store.rooms[roomId] = list.slice(-100);
  await writeStore(store);
  try { const mod = await import('../_events'); (mod as { publish: (room: string, ev: unknown) => void }).publish(roomId, { type: 'chat', roomId, message: msg }); } catch {}
  return NextResponse.json({ ok: true, message: msg });
}