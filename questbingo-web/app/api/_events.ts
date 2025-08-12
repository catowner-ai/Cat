type RoomClient = { roomId: string; res: WritableStreamDefaultWriter; playerId?: string };

const roomsToClients = new Map<string, Set<RoomClient>>();

export function publish(roomId: string, event: any) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  const set = roomsToClients.get(roomId);
  if (!set) return;
  for (const client of set) {
    try {
      client.res.write(encoder.encode(payload));
    } catch {}
  }
}

const encoder = new TextEncoder();

export function addClient(roomId: string, res: WritableStreamDefaultWriter, playerId?: string) {
  const set = roomsToClients.get(roomId) ?? new Set<RoomClient>();
  set.add({ roomId, res, playerId });
  roomsToClients.set(roomId, set);
}

export function removeClient(roomId: string, res: WritableStreamDefaultWriter) {
  const set = roomsToClients.get(roomId);
  if (!set) return;
  for (const c of set) {
    if (c.res === res) set.delete(c);
  }
  if (set.size === 0) roomsToClients.delete(roomId);
}