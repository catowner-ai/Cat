import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type Pet = {
  playerId: string;
  name: string;
  type: 'cat' | 'dog' | 'fox' | 'panda' | 'dragon';
  level: number;
  xp: number;
  xpToNext: number;
  happiness: number; // 0-100
  hunger: number; // 0-100 (0 means full)
  streakDays: number;
  lastCheckin: string; // YYYY-MM-DD
  lastFedAt?: string;
  lastPlayedAt?: string;
  cosmetics: string[];
  treatCountToday?: number;
  treatDay?: string; // YYYY-MM-DD
};

type Store = {
  pets: Record<string, Pet>;
};

function filePath() {
  return path.join(process.cwd(), '.data', 'pets.json');
}

async function ensure() {
  const p = filePath();
  await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => {});
  try {
    await fs.access(p);
  } catch {
    await fs.writeFile(p, JSON.stringify({ pets: {} } satisfies Store, null, 2));
  }
}

async function readStore(): Promise<Store> {
  await ensure();
  const raw = await fs.readFile(filePath(), 'utf8');
  try {
    return JSON.parse(raw) as Store;
  } catch {
    return { pets: {} } as Store;
  }
}

async function writeStore(store: Store) {
  await ensure();
  await fs.writeFile(filePath(), JSON.stringify(store, null, 2));
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function levelThreshold(level: number) {
  return 50 + level * 25;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function defaultPet(playerId: string): Pet {
  return {
    playerId,
    name: 'Buddy',
    type: 'cat',
    level: 1,
    xp: 0,
    xpToNext: levelThreshold(1),
    happiness: 60,
    hunger: 20,
    streakDays: 0,
    lastCheckin: '1970-01-01',
    cosmetics: [],
  };
}

function applyXp(pet: Pet, deltaXp: number) {
  if (deltaXp <= 0) return;
  pet.xp += deltaXp;
  while (pet.xp >= pet.xpToNext) {
    pet.xp -= pet.xpToNext;
    pet.level += 1;
    pet.xpToNext = levelThreshold(pet.level);
    pet.happiness = clamp(pet.happiness + 10, 0, 100);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const playerId = (url.searchParams.get('playerId') || '').slice(0, 64);
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 });
  const store = await readStore();
  let pet = store.pets[playerId];
  if (!pet) {
    pet = defaultPet(playerId);
    store.pets[playerId] = pet;
    await writeStore(store);
  }
  return NextResponse.json({ ok: true, pet });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const playerId = String(body.playerId || '').slice(0, 64);
  const action = String(body.action || '').toLowerCase();
  if (!playerId || !action) return NextResponse.json({ error: 'playerId and action required' }, { status: 400 });

  const store = await readStore();
  let pet = store.pets[playerId];
  if (!pet) {
    pet = defaultPet(playerId);
    store.pets[playerId] = pet;
  }

  const today = todayKey();

  if (action === 'checkin') {
    if (pet.lastCheckin !== today) {
      pet.lastCheckin = today;
      pet.streakDays += 1;
      pet.hunger = clamp(pet.hunger + 5, 0, 100);
      pet.happiness = clamp(pet.happiness + 5, 0, 100);
      applyXp(pet, 10);
      if (pet.streakDays === 3) {
        try {
          await fetch('http://localhost:3000/api/wallet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'achieve', playerId, id: 'streak3', title: '3-Day Streak' }) });
          await fetch('http://localhost:3000/api/wallet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'grant', playerId, coins: 20 }) });
        } catch {}
      }
    }
  } else if (action === 'feed') {
    pet.hunger = clamp(pet.hunger - 15, 0, 100);
    pet.happiness = clamp(pet.happiness + 3, 0, 100);
    pet.lastFedAt = new Date().toISOString();
    applyXp(pet, 5);
  } else if (action === 'play') {
    pet.happiness = clamp(pet.happiness + 10, 0, 100);
    pet.hunger = clamp(pet.hunger + 3, 0, 100);
    pet.lastPlayedAt = new Date().toISOString();
    applyXp(pet, 8);
  } else if (action === 'rename') {
    const name = String(body.name || '').trim().slice(0, 24);
    if (name) pet.name = name;
  } else if (action === 'selecttype') {
    const type = String(body.type || '').toLowerCase();
    if (['cat', 'dog', 'fox', 'panda', 'dragon'].includes(type)) {
      pet.type = type as Pet['type'];
    }
  } else if (action === 'grant') {
    const xp = Number.isFinite(body.xp) ? Number(body.xp) : 0;
    const happiness = Number.isFinite(body.happiness) ? Number(body.happiness) : 0;
    pet.happiness = clamp(pet.happiness + happiness, 0, 100);
    applyXp(pet, xp);
  } else if (action === 'treat') {
    // up to 10 treats per day, small boost
    if (pet.treatDay !== today) {
      pet.treatDay = today;
      pet.treatCountToday = 0;
    }
    const count = pet.treatCountToday ?? 0;
    if (count < 10) {
      pet.treatCountToday = count + 1;
      pet.happiness = clamp(pet.happiness + 1, 0, 100);
      applyXp(pet, 1);
    }
  }

  await writeStore(store);
  try { const mod = await import('../_events'); (mod as { publish: (room: string, ev: unknown) => void }).publish('global', { type: 'pet', playerId, pet: { level: pet.level, happiness: pet.happiness } }); } catch {}
  return NextResponse.json({ ok: true, pet });
}