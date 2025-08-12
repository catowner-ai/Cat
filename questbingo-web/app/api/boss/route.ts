import { NextResponse } from 'next/server';

const BOSSES = [
  { id: 'lines2', title: 'Double Line Day', type: 'lines', threshold: 2, rewardXp: 25, rewardHappy: 8 },
  { id: 'lines3', title: 'Triple Line Challenge', type: 'lines', threshold: 3, rewardXp: 50, rewardHappy: 12 },
  { id: 'match1', title: 'Snap Partner', type: 'match', threshold: 1, rewardXp: 40, rewardHappy: 10 },
] as const;

function dayIndex() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
  const diff = Number(now) - Number(start);
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export async function GET() {
  const boss = BOSSES[dayIndex() % BOSSES.length];
  return NextResponse.json({ boss });
}