"use client";

import { usePresence } from './usePresence';

export default function RoomPresenceBadge({ roomId, nickname }: { roomId: string; nickname: string }) {
  const { count } = usePresence(roomId, nickname);
  return (
    <span className="px-2 py-1 rounded-full border text-xs" title="Room online count">
      👥 {count}
    </span>
  );
}