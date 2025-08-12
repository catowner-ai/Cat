import React, { useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

 type BingoItem = { id: string; label: string; found: boolean };
 type TabKey = 'bingo' | 'snap';

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

 export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('bingo');
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

  const foundCount = useMemo(() => board.filter((b) => b.found).length, [board]);

  const prompt = useMemo(() => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
    const diff = Number(now) - Number(start);
    const oneDay = 1000 * 60 * 60 * 24;
    const day = Math.floor(diff / oneDay);
    return PROMPTS[day % PROMPTS.length];
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => setActiveTab('bingo')} style={[styles.tabBtn, activeTab==='bingo' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab==='bingo' && styles.tabTextActive]}>Bingo</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('snap')} style={[styles.tabBtn, activeTab==='snap' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab==='snap' && styles.tabTextActive]}>Snap</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'bingo' ? (
        <View style={{ paddingHorizontal: 16, width: '100%', maxWidth: 500 }}>
          <Text style={styles.title}>WalkBingo</Text>
          <Text style={styles.subtle}>Find real‑world items. Tap to mark.</Text>
          <View style={styles.grid}>
            {board.map((tile) => (
              <TouchableOpacity
                key={tile.id}
                style={[styles.tile, tile.found && styles.tileFound]}
                onPress={() =>
                  setBoard((prev) => prev.map((t) => (t.id === tile.id ? { ...t, found: !t.found } : t)))
                }
              >
                <Text style={styles.tileText} numberOfLines={3}>
                  {tile.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.subtle}>Progress: {foundCount} / 25</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, width: '100%', maxWidth: 500 }}>
          <Text style={styles.title}>SnapSwap</Text>
          <Text style={styles.subtle}>Today’s prompt</Text>
          <View style={styles.promptBox}>
            <Text style={styles.promptText}>{prompt}</Text>
          </View>
          <Text style={[styles.subtle, { marginTop: 12 }]}>Take a photo from your camera app and share later.</Text>
        </View>
      )}

      <StatusBar style="auto" />
    </SafeAreaView>
  );
 }

 const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#000',
  },
  tabText: { color: '#000' },
  tabTextActive: { color: '#fff' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 4, marginTop: 4 },
  subtle: { color: '#666', marginBottom: 8 },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  tile: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileFound: {
    backgroundColor: '#d1fae5',
    borderColor: '#34d399',
  },
  tileText: { fontSize: 10, textAlign: 'center' },
  promptBox: {
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
  },
  promptText: { fontSize: 18, fontWeight: '500' },
 });
