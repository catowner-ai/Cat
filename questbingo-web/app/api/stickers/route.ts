import { NextResponse } from 'next/server';

const STICKERS = [
  { id: 'hi', label: 'Hi 👋' },
  { id: 'gg', label: 'GG 🏆' },
  { id: 'lul', label: 'LOL 😆' },
  { id: 'wow', label: 'Wow 🤯' },
];

export async function GET() {
  return NextResponse.json({ stickers: STICKERS });
}