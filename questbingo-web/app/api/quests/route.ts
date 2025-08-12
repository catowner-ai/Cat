import { NextResponse } from 'next/server';

const QUESTS = [
  {
    id: 'q1',
    title: 'Kindness Quest',
    minutes: 10,
    steps: [
      'Hold the door or help someone nearby',
      'Snap a discreet photo of the place (no faces)',
      'Write 1 line about how it felt',
    ],
  },
  {
    id: 'q2',
    title: 'Pattern Hunter',
    minutes: 10,
    steps: [
      'Find a repeating pattern in the wild',
      'Frame it from 2 angles',
      'Pick your favorite and share',
    ],
  },
  {
    id: 'q3',
    title: 'Sound Collector',
    minutes: 10,
    steps: [
      'Record 10 seconds of ambient sound',
      'Describe it in 3 words',
      'Pair it with a matching photo',
    ],
  },
];

export async function GET() {
  const idx = new Date().getUTCDate() % QUESTS.length;
  return NextResponse.json({ quest: QUESTS[idx] });
}