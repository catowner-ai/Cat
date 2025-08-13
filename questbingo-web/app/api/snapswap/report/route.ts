import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Report = { id: string; roomId: string; reporterId: string; image?: string; note?: string; createdAt: string };

type Store = { reports: Report[] };

function filePath() { return path.join(process.cwd(), '.data', 'reports.json'); }

async function ensure() {
  const p = filePath();
  await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => {});
  try { await fs.access(p); } catch { await fs.writeFile(p, JSON.stringify({ reports: [] } as Store, null, 2)); }
}

async function readStore(): Promise<Store> { await ensure(); const raw = await fs.readFile(filePath(), 'utf8'); try { return JSON.parse(raw) as Store; } catch { return { reports: [] }; } }
async function writeStore(s: Store) { await ensure(); await fs.writeFile(filePath(), JSON.stringify(s, null, 2)); }

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const reporterId = String(body.playerId || '').slice(0, 64);
  const roomId = String(body.roomId || 'global').slice(0, 32);
  const image = typeof body.image === 'string' ? String(body.image).slice(0, 2048) : undefined;
  const note = typeof body.note === 'string' ? String(body.note).slice(0, 500) : undefined;
  if (!reporterId) return NextResponse.json({ error: 'playerId required' }, { status: 400 });
  const store = await readStore();
  const rep: Report = { id: Math.random().toString(36).slice(2), reporterId, roomId, image, note, createdAt: new Date().toISOString() };
  store.reports.push(rep);
  await writeStore(store);
  try { const mod = await import('../../_events'); (mod as { publish: (room: string, ev: unknown) => void }).publish(roomId, { type: 'report', roomId, reportId: rep.id }); } catch {}
  return NextResponse.json({ ok: true });
}