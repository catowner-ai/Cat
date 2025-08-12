import { NextResponse } from 'next/server';

const PROMPTS = [
  'A splash of red',
  'Something that looks like a face',
  'Shadow forming a shape',
  'Your city in reflection',
  'Tiny but mighty',
  'Unexpected symmetry',
  'Texture up close',
  'Good vibes only',
  'Blue and yellow together',
  'Lines that lead the eye',
  'Circle in the wild',
  'A secret corner',
  'Motion blur',
  'Cozy nook',
  'Serendipity',
];

export async function GET() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
  const diff = Number(now) - Number(start);
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  const prompt = PROMPTS[day % PROMPTS.length];
  return NextResponse.json({ prompt });
}