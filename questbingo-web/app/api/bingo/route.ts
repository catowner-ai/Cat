import { NextResponse } from 'next/server';

function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CANDIDATES = [
  'Red car',
  'Dog on a leash',
  'Street musician',
  'Coffee cup',
  'Bicycle',
  'Stop sign',
  'Flower shop',
  'Neon sign',
  'Umbrella',
  'Cat in a window',
  'Bus stop',
  'Delivery scooter',
  'Street art',
  'Pigeon',
  'Park bench',
  'Bookstore',
  'Skateboard',
  'Sunset glow',
  'Balloon',
  'Yellow door',
  'Mirror selfie',
  'Crosswalk',
  'Fountain',
  'Bridge view',
  'Cloud shaped like animal',
  'Couple holding hands',
  'Number 7',
  'Rainbow color',
  'Food truck',
  'Sports jersey',
];

export async function GET() {
  const today = new Date();
  const key = today.toISOString().slice(0, 10); // YYYY-MM-DD
  const seed = xmur3(key)();
  const rnd = mulberry32(seed);

  const shuffled = [...CANDIDATES]
    .map((v) => ({ v, r: rnd() }))
    .sort((a, b) => a.r - b.r)
    .map((o) => o.v)
    .slice(0, 25);

  const items = shuffled.map((label, idx) => ({ id: String(idx), label, found: false }));

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  // For MVP: accept toggle but do not persist server-side
  const body = await req.json().catch(() => null);
  return NextResponse.json({ ok: true, received: body });
}