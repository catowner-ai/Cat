import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3000'; // Change if your web server runs elsewhere

type BingoItem = { id: string; label: string; found: boolean };
type Quest = { id: string; title: string; minutes: number; steps: string[] };

type PetType = 'cat' | 'dog' | 'fox' | 'panda' | 'dragon';

type Pet = {
  playerId: string;
  name: string;
  type: PetType;
  level: number;
  xp: number;
  xpToNext: number;
  happiness: number;
  hunger: number;
  streakDays: number;
  lastCheckin: string;
};

type TabKey = 'bingo' | 'snap' | 'quest' | 'pet';

function seedRandomFromDate(date: Date) {
  const key = date.toISOString().slice(0, 10);
  let h = 1779033703 ^ key.length;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
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
  'Red car','Dog on a leash','Street musician','Coffee cup','Bicycle','Stop sign','Flower shop','Neon sign','Umbrella','Cat in a window','Bus stop','Delivery scooter','Street art','Pigeon','Park bench','Bookstore','Skateboard','Sunset glow','Balloon','Yellow door','Mirror selfie','Crosswalk','Fountain','Bridge view','Cloud shaped like animal','Couple holding hands','Number 7','Rainbow color','Food truck','Sports jersey'
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('bingo');
  const [nickname, setNickname] = useState<string>('guest');
  const [roomId, setRoomId] = useState<string>('global');

  const [board, setBoard] = useState<BingoItem[]>(() => {
    const seedFn = seedRandomFromDate(new Date());
    const rnd = mulberry32(seedFn());
    const shuffled = [...CANDIDATES]
      .map((v) => ({ v, r: rnd() }))
      .sort((a, b) => a.r - b.r)
      .map((o) => o.v)
      .slice(0, 25);
    return shuffled.map((label, idx) => ({ id: String(idx), label, found: false }));
  });

  const [prompt, setPrompt] = useState<string>('');
  const [quest, setQuest] = useState<Quest | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [peerImage, setPeerImage] = useState<string | null>(null);
  const [guessInput, setGuessInput] = useState<string>('');
  const [boss, setBoss] = useState<{ id: string; title: string } | null>(null);
  const [bossProgress, setBossProgress] = useState<{ progress: number; ready: boolean; already: boolean } | null>(null);
  const [chatInput, setChatInput] = useState<string>('');
  const [messages, setMessages] = useState<{ id: string; playerId: string; text: string; createdAt: string }[]>([]);
  const [stickers, setStickers] = useState<{ id: string; label: string }[]>([]);
  const [stickerToSend, setStickerToSend] = useState<string>('');
  const [coins, setCoins] = useState<number>(0);

  const [pet, setPet] = useState<Pet | null>(null);
  const [petType, setPetType] = useState<PetType>('cat');
  const [petNameInput, setPetNameInput] = useState<string>('');

  const foundCount = useMemo(() => board.filter((b) => b.found).length, [board]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/prompt`);
        const d = await r.json();
        setPrompt(d.prompt);
      } catch {}
      try {
        const r = await fetch(`${API_BASE}/api/quests`);
        const d = await r.json();
        setQuest(d.quest);
      } catch {}
      try {
        const r = await fetch(`${API_BASE}/api/boss`);
        const d = await r.json();
        setBoss(d.boss);
      } catch {}
      try {
        const r = await fetch(`${API_BASE}/api/boss/progress?playerId=${encodeURIComponent(nickname)}&roomId=${encodeURIComponent(roomId)}`);
        const d = await r.json();
        setBossProgress({ progress: d.progress ?? 0, ready: !!d.ready, already: !!d.already });
      } catch {}
      try {
        const r = await fetch(`${API_BASE}/api/chat?room=${encodeURIComponent(roomId)}`);
        const d = await r.json();
        setMessages(d.messages || []);
      } catch {}
      try {
        const r = await fetch(`${API_BASE}/api/stickers`);
        const d = await r.json();
        setStickers(d.stickers || []);
      } catch {}
      try {
        const r = await fetch(`${API_BASE}/api/wallet?playerId=${encodeURIComponent(nickname)}`);
        const d = await r.json();
        setCoins(d.wallet?.coins ?? 0);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/pet?playerId=${encodeURIComponent(nickname)}`);
        const d = await r.json();
        setPet(d.pet);
        setPetType(d.pet.type);
        setPetNameInput(d.pet.name);
        await fetch(`${API_BASE}/api/pet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'checkin' }) });
        const r2 = await fetch(`${API_BASE}/api/pet?playerId=${encodeURIComponent(nickname)}`);
        const d2 = await r2.json();
        setPet(d2.pet);
      } catch {}
    })();
  }, [nickname]);

  const countLines = (tiles: BingoItem[]) => {
    const grid = Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => tiles[r * 5 + c].found));
    let lines = 0;
    for (let r = 0; r < 5; r++) if (grid[r].every(Boolean)) lines++;
    for (let c = 0; c < 5; c++) if (grid.every((row) => row[c])) lines++;
    if ([0,1,2,3,4].every((i) => grid[i][i])) lines++;
    if ([0,1,2,3,4].every((i) => grid[i][4-i])) lines++;
    return lines;
  };

  const toggleTile = async (id: string) => {
    const next = board.map((t) => (t.id === id ? { ...t, found: !t.found } : t));
    setBoard(next);
    const lines = countLines(next);
    try {
      await fetch(`${API_BASE}/api/leaderboard`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, roomId, lines }) });
    } catch {}
    try {
      await fetch(`${API_BASE}/api/pet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'grant', xp: 1, happiness: 1 }) });
      const r = await fetch(`${API_BASE}/api/pet?playerId=${encodeURIComponent(nickname)}`);
      setPet((await r.json()).pet);
    } catch {}
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo access to continue.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const base64 = asset.base64;
      if (base64) {
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        setSelectedImage(dataUrl);
      }
    }
  };

  const offerSnap = async () => {
    if (!selectedImage) return;
    try {
      const r = await fetch(`${API_BASE}/api/snapswap/offer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, roomId, image: selectedImage }) });
      const d = await r.json();
      if (d.matched) Alert.alert('Matched!', 'You have been paired. Tap Check match.');
      else Alert.alert('Waiting', 'Waiting for a partner…');
    } catch {}
  };

  const checkMatch = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/snapswap/match?playerId=${encodeURIComponent(nickname)}&roomId=${encodeURIComponent(roomId)}`);
      const d = await r.json();
      if (d.ready) {
        setPeerImage(d.partner.image);
        // reward moved to guess
      } else {
        Alert.alert('Not ready yet', 'Try again in a moment.');
      }
    } catch {}
  };

  const guessAuthor = async () => {
    if (!guessInput) return;
    try {
      const r = await fetch(`${API_BASE}/api/snapswap/guess`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, roomId, guess: guessInput }) });
      const d = await r.json();
      if (d.correct) {
        Alert.alert('Correct!', `Partner is ${d.partner.playerId}`);
        await fetch(`${API_BASE}/api/pet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'grant', xp: 12, happiness: 5 }) });
        const r2 = await fetch(`${API_BASE}/api/pet?playerId=${encodeURIComponent(nickname)}`);
        setPet((await r2.json()).pet);
      } else {
        Alert.alert('Wrong', 'Try again.');
      }
    } catch {}
  };

  const claimBoss = async () => {
    if (!boss) return;
    try {
      const r = await fetch(`${API_BASE}/api/boss/claim`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, roomId, bossId: boss.id }) });
      const d = await r.json();
      if (d.ok) {
        Alert.alert('Claimed', 'Rewards granted!');
        const r2 = await fetch(`${API_BASE}/api/pet?playerId=${encodeURIComponent(nickname)}`);
        setPet((await r2.json()).pet);
        const r3 = await fetch(`${API_BASE}/api/boss/progress?playerId=${encodeURIComponent(nickname)}&roomId=${encodeURIComponent(roomId)}`);
        const d3 = await r3.json();
        setBossProgress({ progress: d3.progress ?? 0, ready: !!d3.ready, already: !!d3.already });
      } else {
        Alert.alert('Not ready', d.reason || 'unknown');
      }
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'quest' && quest) {
      (async () => {
        try { await fetch(`${API_BASE}/api/leaderboard`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, roomId, questsInc: 1 }) }); } catch {}
        try {
          await fetch(`${API_BASE}/api/pet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'grant', xp: 10, happiness: 3 }) });
          const r = await fetch(`${API_BASE}/api/pet?playerId=${encodeURIComponent(nickname)}`);
          setPet((await r.json()).pet);
        } catch {}
      })();
    }
  }, [activeTab]);

  useEffect(() => {
    const i = setInterval(async () => {
      if (activeTab === 'quest') {
        try {
          const r = await fetch(`${API_BASE}/api/chat?room=${encodeURIComponent(roomId)}`);
          const d = await r.json();
          setMessages(d.messages || []);
        } catch {}
      }
    }, 5000);
    return () => clearInterval(i);
  }, [activeTab, roomId]);

  const PetFace = ({ type }: { type: PetType }) => {
    const map: Record<PetType, string> = { cat: '🐱', dog: '🐶', fox: '🦊', panda: '🐼', dragon: '🐲' };
    return <Text style={{ fontSize: 48 }}>{map[type] || '🐾'}</Text>;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TextInput value={nickname} onChangeText={(t) => setNickname(t.slice(0,24))} placeholder="nickname" style={styles.input} />
        <TextInput value={roomId} onChangeText={(t) => setRoomId(t.slice(0,32))} placeholder="room" style={[styles.input, { width: 100 }]} />
      </View>
      <View style={styles.tabBar}>
        {(['bingo','snap','quest','pet'] as TabKey[]).map((k) => (
          <TouchableOpacity key={k} onPress={() => setActiveTab(k)} style={[styles.tabBtn, activeTab===k && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab===k && styles.tabTextActive]}>{k.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 16, paddingBottom: 60, width: '100%' }}>
        {activeTab === 'bingo' && (
          <View style={{ width: '100%', maxWidth: 520 }}>
            <Text style={styles.title}>WalkBingo</Text>
            <Text style={styles.subtle}>Find real‑world items. Tap to mark.</Text>
            <View style={styles.grid}>
              {board.map((tile) => (
                <TouchableOpacity key={tile.id} style={[styles.tile, tile.found && styles.tileFound]} onPress={() => toggleTile(tile.id)}>
                  <Text style={styles.tileText} numberOfLines={3}>{tile.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.subtle}>Progress: {foundCount} / 25</Text>
          </View>
        )}

        {activeTab === 'snap' && (
          <View style={{ width: '100%', maxWidth: 520 }}>
            <Text style={styles.title}>SnapSwap</Text>
            <Text style={styles.subtle}>Today’s prompt</Text>
            <View style={styles.promptBox}><Text style={styles.promptText}>{prompt || '...'}</Text></View>
            <View style={{ marginTop: 12, gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.actionBtn} onPress={pickImage}><Text>Pick image</Text></TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={offerSnap}><Text>Offer</Text></TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={checkMatch}><Text>Check match</Text></TouchableOpacity>
              </View>
              {selectedImage && (
                <Image source={{ uri: selectedImage }} style={{ width: '100%', height: 200, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' }} resizeMode="cover" />
              )}
              {peerImage && (
                <>
                  <Image source={{ uri: peerImage }} style={{ width: '100%', height: 200, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' }} resizeMode="cover" />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TextInput value={guessInput} onChangeText={setGuessInput} placeholder="Guess author" style={[styles.input, { flex: 1 }]} />
                    <TouchableOpacity style={styles.actionBtn} onPress={guessAuthor}><Text>Guess</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={async ()=>{ await fetch(`${API_BASE}/api/snapswap/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, roomId, image: peerImage, note: 'inappropriate' }) }); Alert.alert('Reported'); }}><Text>Report</Text></TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {activeTab === 'quest' && (
          <View style={{ width: '100%', maxWidth: 520 }}>
            <Text style={styles.title}>Daily Quest</Text>
            {quest ? (
              <View style={styles.card}>
                <Text style={styles.promptText}>{quest.title}</Text>
                <Text style={styles.subtle}>{quest.minutes} minutes</Text>
                {quest.steps.map((s, i) => (
                  <Text key={i} style={{ marginTop: 4 }}>• {s}</Text>
                ))}
              </View>
            ) : (
              <Text style={styles.subtle}>Loading…</Text>
            )}
            {boss && (
              <View style={[styles.card, { marginTop: 10 }] }>
                <Text style={styles.subtle}>Boss: {boss.title}</Text>
                {bossProgress && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.subtle}>Progress {bossProgress.progress}</Text>
                  </View>
                )}
                <TouchableOpacity style={[styles.actionBtn, { marginTop: 8, opacity: bossProgress?.ready && !bossProgress?.already ? 1 : 0.5 }]} disabled={!bossProgress?.ready || bossProgress?.already} onPress={claimBoss}><Text>{bossProgress?.already ? 'Already' : 'Claim'}</Text></TouchableOpacity>
              </View>
            )}
            <View style={[styles.card, { marginTop: 10 }]}>
              <Text style={styles.subtle}>Room chat</Text>
              <View style={{ maxHeight: 200 }}>
                <ScrollView>
                  {messages.map((m)=> (
                    <Text key={m.id} style={{ marginTop: 2 }}><Text style={{ color: '#666' }}>{m.playerId}: </Text>{m.text}</Text>
                  ))}
                </ScrollView>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TextInput value={chatInput} onChangeText={setChatInput} placeholder="Say something…" style={[styles.input, { flex: 1 }]} />
                <TouchableOpacity style={styles.actionBtn} onPress={async ()=>{ if (!chatInput.trim()) return; await fetch(`${API_BASE}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, playerId: nickname, text: chatInput.trim() }) }); setChatInput(''); const r = await fetch(`${API_BASE}/api/chat?room=${encodeURIComponent(roomId)}`); setMessages((await r.json()).messages || []); }}><Text>Send</Text></TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <Text style={styles.subtle}>Sticker</Text>
                <ScrollView horizontal>
                  {stickers.map((s)=> (
                    <TouchableOpacity key={s.id} style={[styles.chip, stickerToSend===s.id && styles.chipActive]} onPress={()=> setStickerToSend(s.id)}><Text style={[styles.chipText, stickerToSend===s.id && styles.chipTextActive]}>{s.label}</Text></TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.actionBtn} onPress={async ()=>{ if (!stickerToSend) return; await fetch(`${API_BASE}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, playerId: nickname, stickerId: stickerToSend }) }); setStickerToSend(''); const r = await fetch(`${API_BASE}/api/chat?room=${encodeURIComponent(roomId)}`); setMessages((await r.json()).messages || []); }}><Text>Send sticker</Text></TouchableOpacity>
              </View>
            </View>
            <View style={[styles.card, { marginTop: 10 }]}>
              <Text style={styles.subtle}>Wallet · Coins: {coins}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={styles.actionBtn} onPress={async ()=>{ await fetch(`${API_BASE}/api/wallet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'grant', playerId: nickname, coins: 10 }) }); const r = await fetch(`${API_BASE}/api/wallet?playerId=${encodeURIComponent(nickname)}`); setCoins((await r.json()).wallet?.coins ?? 0); }}><Text>+10 coins</Text></TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={async ()=>{ await fetch(`${API_BASE}/api/wallet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'buy', playerId: nickname, kind: 'sticker', itemId: 'hi' }) }); const r = await fetch(`${API_BASE}/api/wallet?playerId=${encodeURIComponent(nickname)}`); setCoins((await r.json()).wallet?.coins ?? 0); }}><Text>Buy :hi:</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'pet' && (
          <View style={{ width: '100%', maxWidth: 520 }}>
            <Text style={styles.title}>Your Buddy</Text>
            {!pet ? (
              <Text style={styles.subtle}>Set nickname to create your pet.</Text>
            ) : (
              <View style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <PetFace type={pet.type} />
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '600' }}>{pet.name}</Text>
                    <Text style={styles.subtle}>Level {pet.level} · Streak {pet.streakDays}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.subtle}>XP {pet.xp} / {pet.xpToNext}</Text>
                  <View style={{ height: 8, borderRadius: 999, backgroundColor: '#eee', width: '100%' }}>
                    <View style={{ height: 8, borderRadius: 999, backgroundColor: '#10b981', width: `${Math.min(100, Math.round((pet.xp/Math.max(1, pet.xpToNext))*100))}%` }} />
                  </View>
                </View>
                <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text>Happiness: {pet.happiness}</Text>
                  <Text>Hunger: {pet.hunger}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity style={styles.actionBtn} onPress={async () => { await fetch(`${API_BASE}/api/pet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'feed' }) }); const r = await fetch(`${API_BASE}/api/pet?playerId=${encodeURIComponent(nickname)}`); setPet((await r.json()).pet); }}><Text>Feed</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={async () => { await fetch(`${API_BASE}/api/pet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'play' }) }); const r = await fetch(`${API_BASE}/api/pet?playerId=${encodeURIComponent(nickname)}`); setPet((await r.json()).pet); }}><Text>Play</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={async () => { await fetch(`${API_BASE}/api/pet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'checkin' }) }); const r = await fetch(`${API_BASE}/api/pet?playerId=${encodeURIComponent(nickname)}`); setPet((await r.json()).pet); }}><Text>Check‑in</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={async () => { await fetch(`${API_BASE}/api/pet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'treat' }) }); const r = await fetch(`${API_BASE}/api/pet?playerId=${encodeURIComponent(nickname)}`); setPet((await r.json()).pet); }}><Text>Treat</Text></TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <Text style={styles.subtle}>Rename</Text>
                  <TextInput value={petNameInput} onChangeText={(t) => setPetNameInput(t.slice(0,24))} style={[styles.input, { flex: 1 }]} />
                  <TouchableOpacity style={styles.actionBtn} onPress={async () => { await fetch(`${API_BASE}/api/pet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'rename', name: petNameInput }) }); const r = await fetch(`${API_BASE}/api/pet?playerId=${encodeURIComponent(nickname)}`); setPet((await r.json()).pet); }}><Text>Save</Text></TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <Text style={styles.subtle}>Type</Text>
                  {(['cat','dog','fox','panda','dragon'] as PetType[]).map((t) => (
                    <TouchableOpacity key={t} style={[styles.chip, petType===t && styles.chipActive]} onPress={() => setPetType(t)}><Text style={[styles.chipText, petType===t && styles.chipTextActive]}>{t}</Text></TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.actionBtn} onPress={async () => { await fetch(`${API_BASE}/api/pet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'selecttype', type: petType }) }); const r = await fetch(`${API_BASE}/api/pet?playerId=${encodeURIComponent(nickname)}`); setPet((await r.json()).pet); }}><Text>Save</Text></TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', gap: 8, padding: 12, justifyContent: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  tabBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#ddd' },
  tabActive: { backgroundColor: '#000' },
  tabText: { color: '#000', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 4, marginTop: 4 },
  subtle: { color: '#666', marginBottom: 8 },
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  tile: { width: '18%', aspectRatio: 1, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f5f5f5', padding: 6, justifyContent: 'center', alignItems: 'center' },
  tileFound: { backgroundColor: '#d1fae5', borderColor: '#34d399' },
  tileText: { fontSize: 10, textAlign: 'center' },
  promptBox: { borderWidth: 1, borderColor: '#eee', backgroundColor: '#fafafa', borderRadius: 12, padding: 16 },
  promptText: { fontSize: 18, fontWeight: '500' },
  actionBtn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  card: { borderWidth: 1, borderColor: '#eee', backgroundColor: '#fafafa', borderRadius: 12, padding: 16, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: '#000' },
  chipText: { color: '#000' },
  chipTextActive: { color: '#fff' },
});
