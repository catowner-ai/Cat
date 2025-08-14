'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
const PWAInstall = dynamic(() => import('./PWAInstall'), { ssr: false });
const InviteQR = dynamic(() => import('./InviteQR'), { ssr: false });
const SharePoster = dynamic(() => import('./SharePoster'), { ssr: false });
import { useBeep } from './useSound';
import { useConfetti } from './useConfetti';

type BingoItem = { id: string; label: string; found: boolean };

type BingoBoardResponse = { items: BingoItem[] };

type PromptResponse = { prompt: string };

type Quest = { id: string; title: string; minutes: number; steps: string[] };

type QuestResponse = { quest: Quest };

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

type PetResponse = { ok: boolean; pet: Pet };

type TabKey = 'bingo' | 'snap' | 'quest' | 'pet';

type Lang = 'en' | 'zh';

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    bingo: 'Bingo',
    snap: 'SnapSwap',
    quest: 'Quest',
    pet: 'Pet',
    walkBingoTitle: 'WalkBingo',
    walkBingoDesc: 'Find real‑world items on a 5×5 board. Tap to mark what you spot.',
    progress: 'Progress',
    lines: 'Lines',
    share: 'Share',
    todaysPrompt: "Today’s prompt",
    snapDesc: "Shoot today’s prompt, swap with friends, and guess who’s who.",
    questTitle: 'Daily Quest',
    questMinutes: 'minutes',
    luckySpin: 'Lucky Spin',
    copied: 'Copied your progress!',
    petTitle: 'Your Buddy',
    feed: 'Feed',
    play: 'Play',
    rename: 'Rename',
    save: 'Save',
    type: 'Type',
    level: 'Level',
    happiness: 'Happiness',
    hunger: 'Hunger',
    streak: 'Streak',
    checkin: 'Daily check‑in',
  },
  zh: {
    bingo: '賓果',
    snap: '盲拍互換',
    quest: '任務',
    pet: '寵物',
    walkBingoTitle: '走走賓果',
    walkBingoDesc: '在 5×5 棋盤找生活物件，點一下標記發現。',
    progress: '進度',
    lines: '連線',
    share: '分享',
    todaysPrompt: '今日主題',
    snapDesc: '拍下主題，互換照片，猜猜是誰拍的。',
    questTitle: '今日任務',
    questMinutes: '分鐘',
    luckySpin: '幸運轉盤',
    copied: '已複製你的進度！',
    petTitle: '你的夥伴',
    feed: '餵食',
    play: '玩耍',
    rename: '改名',
    save: '儲存',
    type: '品種',
    level: '等級',
    happiness: '快樂',
    hunger: '飢餓',
    streak: '連續天數',
    checkin: '每日簽到',
  },
};

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem('questbingo.lang') as Lang | null;
  if (saved === 'en' || saved === 'zh') return saved;
  const nav = navigator.language.toLowerCase();
  return nav.startsWith('zh') ? 'zh' : 'en';
}

function countCompletedLines(tiles: BingoItem[]): number {
  if (tiles.length < 25) return 0;
  const grid = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => tiles[r * 5 + c].found)
  );
  let lines = 0;
  for (let r = 0; r < 5; r++) if (grid[r].every(Boolean)) lines++;
  for (let c = 0; c < 5; c++) if (grid.every((row) => row[c])) lines++;
  if ([0, 1, 2, 3, 4].every((i) => grid[i][i])) lines++;
  if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i])) lines++;
  return lines;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('bingo');
  const [lang, setLang] = useState<Lang>(getInitialLang);
  const [board, setBoard] = useState<BingoItem[]>([]);
  const [loadingBoard, setLoadingBoard] = useState<boolean>(true);
  const [prompt, setPrompt] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<{ playerId: string; lines: number; quests: number }[]>([]);
  const [peerImage, setPeerImage] = useState<string | null>(null);
  const [questCounted, setQuestCounted] = useState<boolean>(false);
  const [nickname, setNickname] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('global');
  const [showInvite, setShowInvite] = useState<boolean>(false);
  const [showPoster, setShowPoster] = useState<boolean>(false);
  const [matchInfo, setMatchInfo] = useState<string>('');
  const beep = useBeep();
  const confetti = useConfetti();
  const [pet, setPet] = useState<Pet | null>(null);
  const [petLoading, setPetLoading] = useState<boolean>(false);
  const [petNameInput, setPetNameInput] = useState<string>('');
  const [petType, setPetType] = useState<PetType>('cat');

  const t = (k: string) => STRINGS[lang][k] ?? k;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomFromQuery = params.get('room');
      const n = window.localStorage.getItem('questbingo.nickname') || '';
      const r = roomFromQuery || window.localStorage.getItem('questbingo.room') || 'global';
      setNickname(n);
      setRoomId(r);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('questbingo.lang', lang);
      window.localStorage.setItem('questbingo.nickname', nickname);
      window.localStorage.setItem('questbingo.room', roomId);
    }
  }, [lang, nickname, roomId]);

  useEffect(() => {
    const loadBoard = async () => {
      setLoadingBoard(true);
      try {
        const res = await fetch('/api/bingo', { cache: 'no-store' });
        const data: BingoBoardResponse = await res.json();
        setBoard(data.items);
      } catch {
        setBoard(
          Array.from({ length: 25 }, (_, i) => ({ id: String(i), label: `Tile ${i + 1}`, found: false }))
        );
      } finally {
        setLoadingBoard(false);
      }
    };
    const loadPrompt = async () => {
      try {
        const res = await fetch('/api/prompt', { cache: 'no-store' });
        const data: PromptResponse = await res.json();
        setPrompt(data.prompt);
      } catch {
        setPrompt('A splash of red in your city.');
      }
    };
    const loadQuest = async () => {
      try {
        const res = await fetch('/api/quests', { cache: 'no-store' });
        const data: QuestResponse = await res.json();
        setQuest(data.quest);
      } catch {
        setQuest(null);
      }
    };
    const loadPeer = async () => {
      try {
        const res = await fetch('/api/snapswap', { cache: 'no-store' });
        const data = await res.json();
        setPeerImage(data?.peer?.image || null);
      } catch {}
    };

    loadBoard();
    loadPrompt();
    loadQuest();
    loadPeer();
  }, []);

  useEffect(() => {
    (async () => {
      if (!nickname) return;
      try {
        setPetLoading(true);
        const res = await fetch(`/api/pet?playerId=${encodeURIComponent(nickname)}`, { cache: 'no-store' });
        const data: PetResponse = await res.json();
        setPet(data.pet);
        setPetNameInput(data.pet.name);
        setPetType(data.pet.type);
        await fetch('/api/pet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: nickname, action: 'checkin' }),
        });
        const refreshed = await fetch(`/api/pet?playerId=${encodeURIComponent(nickname)}`);
        const rd: PetResponse = await refreshed.json();
        setPet(rd.pet);
      } catch {}
      finally { setPetLoading(false); }
    })();
  }, [nickname]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/leaderboard?room=${encodeURIComponent(roomId)}`, { cache: 'no-store' });
        const data = await res.json();
        if (alive) setLeaderboard((data.entries || []).slice(0, 5));
      } catch {}
      // presence join + heartbeat
      try { await fetch('/api/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, playerId: nickname || 'guest', action: 'join' }) }); } catch {}
      const iv = setInterval(() => {
        fetch('/api/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, playerId: nickname || 'guest', action: 'heartbeat' }) }).catch(() => {});
      }, 15000);
      return () => clearInterval(iv);
    })();
    return () => { alive = false; };
  }, [roomId, nickname]);

  useEffect(() => {
    if (activeTab === 'quest' && !questCounted) {
      setQuestCounted(true);
      fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: nickname || 'guest', roomId, questsInc: 1 }),
      }).catch(() => {});
      // grant pet xp/happiness for doing a quest
      if (nickname) {
        fetch('/api/pet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: nickname, action: 'grant', xp: 10, happiness: 3 }),
        }).catch(() => {});
      }
    }
  }, [activeTab, questCounted, nickname, roomId]);

  const foundCount = useMemo(() => board.filter((b) => b.found).length, [board]);
  const lineCount = useMemo(() => countCompletedLines(board), [board]);

  const refreshPet = async () => {
    if (!nickname) return;
    const r = await fetch(`/api/pet?playerId=${encodeURIComponent(nickname)}`);
    const d: PetResponse = await r.json();
    setPet(d.pet);
  };

  const onTileToggle = (id: string) => {
    beep(880, 70);
    setBoard((prev) => prev.map((t) => (t.id === id ? { ...t, found: !t.found } : t)));
    setTimeout(async () => {
      const lines = countCompletedLines(
        board.map((t) => (t.id === id ? { ...t, found: !t.found } : t))
      );
      try {
        await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: nickname || 'guest', roomId, lines }),
        });
      } catch {}
      // rewards
      if (nickname) {
        fetch('/api/pet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: nickname, action: 'grant', xp: 1, happiness: 1 }),
        }).then(refreshPet).catch(() => {});
      }
      // achievements when hitting lines milestones
      if (nickname && (lines === 1 || lines === 3 || lines === 5)) {
        const map: Record<number, { key: string; label: string; icon: string }> = {
          1: { key: 'first_line', label: 'First Line', icon: '🥇' },
          3: { key: 'hat_trick', label: 'Hat Trick', icon: '🎩' },
          5: { key: 'bingo_master', label: 'Bingo Master', icon: '🏆' },
        };
        const a = map[lines];
        if (a) {
          fetch('/api/achievements', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, ...a })
          }).catch(() => {});
          confetti();
          beep(1200, 120);
        }
      }
    }, 0);
  };

  const onShare = async () => {
    const text = `QuestBingo — ${t('progress')}: ${foundCount}/25 · ${t('lines')}: ${lineCount}`;
    const navShare = (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share;
    if (typeof navShare === 'function') {
      try {
        await navShare({ title: 'QuestBingo', text, url: typeof window !== 'undefined' ? window.location.href : undefined });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert(t('copied'));
      } catch {}
    }
  };

  async function compressImage(file: File, maxSize = 1280, quality = 0.8): Promise<string> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  }

  const onImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await compressImage(file, 1280, 0.82);
        setSelectedImage(dataUrl);
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === 'string' ? reader.result : '';
          setSelectedImage(result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const spinLucky = async () => {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 1200);
    try {
      await fetch('/api/achievements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname || 'guest', key: 'lucky_spin', label: 'Lucky Spin', icon: '🍀' }) });
    } catch {}
  };

  const PetFace = ({ type }: { type: PetType }) => {
    const map: Record<PetType, string> = {
      cat: '🐱',
      dog: '🐶',
      fox: '🦊',
      panda: '🐼',
      dragon: '🐲',
    };
    return <span style={{ fontSize: 48 }} aria-label={type} role="img">{map[type] || '🐾'}</span>;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex gap-2 mr-auto">
          <button
            onClick={() => setActiveTab('bingo')}
            className={`px-4 py-2 rounded-full border text-sm ${activeTab === 'bingo' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent'}`}
          >
            {t('bingo')}
          </button>
          <button
            onClick={() => setActiveTab('snap')}
            className={`px-4 py-2 rounded-full border text-sm ${activeTab === 'snap' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent'}`}
          >
            {t('snap')}
          </button>
          <button
            onClick={() => setActiveTab('quest')}
            className={`px-4 py-2 rounded-full border text-sm ${activeTab === 'quest' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent'}`}
          >
            {t('quest')}
          </button>
          <button
            onClick={() => setActiveTab('pet')}
            className={`px-4 py-2 rounded-full border text-sm ${activeTab === 'pet' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent'}`}
          >
            {t('pet')}
          </button>
          {/* PWA install */}
          <div className="hidden sm:block"><PWAInstall /></div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <input value={nickname} onChange={(e) => setNickname(e.target.value.slice(0,24))} placeholder="nickname" className="px-2 py-1 rounded border bg-transparent" />
          <input value={roomId} onChange={(e) => setRoomId(e.target.value.slice(0,32))} placeholder="room" className="px-2 py-1 rounded border bg-transparent w-28" />
          <button
            onClick={() => setShowInvite(true)}
            className="px-2 py-1 rounded border"
            title="Invite people via QR"
          >Invite</button>
          <button onClick={() => setLang('en')} className={`px-2 py-1 rounded ${lang==='en' ? 'bg-black text-white dark:bg-white dark:text-black' : 'border'}`}>EN</button>
          <button onClick={() => setLang('zh')} className={`px-2 py-1 rounded ${lang==='zh' ? 'bg-black text-white dark:bg-white dark:text-black' : 'border'}`}>中文</button>
        </div>
      </div>

      {activeTab === 'bingo' ? (
        <section>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{t('walkBingoTitle')}</h1>
            <button onClick={spinLucky} className={`px-3 py-1.5 rounded-md border text-xs ${spinning ? 'animate-pulse' : ''}`}>{t('luckySpin')}</button>
          </div>
          <p className="text-sm opacity-75 mb-4">{t('walkBingoDesc')}</p>

          {loadingBoard ? (
            <div className="opacity-70 text-sm">Loading board…</div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {board.map((tile) => (
                <button
                  key={tile.id}
                  onClick={() => onTileToggle(tile.id)}
                  aria-pressed={tile.found}
                  className={`h-24 p-2 rounded-xl border text-left text-xs transition-colors duration-150 hover:scale-[0.99] active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 ${
                    tile.found ? 'bg-emerald-500/10 border-emerald-400/50' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10'
                  } ${spinning ? 'rotate-1' : ''}`}
                  title={tile.label}
                >
                  <div className="font-medium line-clamp-3">{tile.label}</div>
                  <div className="mt-2 text-[10px] opacity-60">Tap to {tile.found ? 'unmark' : 'mark'}</div>
                </button>
              ))}
            </div>
          )}

                      <div className="mt-4 flex items-center gap-3 text-sm">
              <div>
                {t('progress')}: {foundCount} / 25 · {t('lines')}: {lineCount}
              </div>
              <button onClick={async () => { await onShare(); beep(780, 90); }} className="px-3 py-1.5 rounded-md border">
                {t('share')}
              </button>
              <button onClick={() => setShowPoster(true)} className="px-3 py-1.5 rounded-md border">
                Poster
              </button>
            </div>
        </section>
      ) : activeTab === 'snap' ? (
        <section>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">{t('snap')}</h1>
          <p className="text-sm opacity-75 mb-4">{t('snapDesc')}</p>

          <div className="rounded-xl border p-4 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
            <div className="text-sm mb-2">{t('todaysPrompt')}</div>
            <div className="text-lg font-medium">{prompt || 'Loading…'}</div>
          </div>

          <div className="mt-4">
            <input type="file" accept="image/*" capture="environment" onChange={onImageSelect} />
            {selectedImage && (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedImage} alt="Selected" className="max-h-60 rounded-lg border" />
                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  <button
                    className="px-3 py-1.5 rounded-md border text-sm"
                    onClick={async () => {
                      setMatchInfo('Offering…');
                      const r = await fetch('/api/snapswap/offer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ playerId: nickname || 'guest', roomId, image: selectedImage }),
                      });
                      const data = await r.json();
                      if (data.matched) {
                        setMatchInfo('Matched! Fetching…');
                      } else {
                        setMatchInfo('Waiting for a partner…');
                      }
                    }}
                  >
                    Offer to room
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-md border text-sm"
                    onClick={async () => {
                      const r = await fetch(`/api/snapswap/match?playerId=${encodeURIComponent(nickname || 'guest')}&roomId=${encodeURIComponent(roomId)}`);
                      const d = await r.json();
                                             if (d.ready) {
                         setPeerImage(d.partner.image);
                         setMatchInfo('Matched with ' + (d.partner.playerId || 'someone'));
                         confetti();
                         beep(660, 140);
                         if (nickname) {
                           fetch('/api/pet', {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({ playerId: nickname, action: 'grant', xp: 8, happiness: 4 }),
                           }).then(refreshPet).catch(() => {});
                         }
                       } else {
                        setMatchInfo('Not ready yet, try again in a moment.');
                      }
                    }}
                  >
                    Check match
                  </button>
                  {matchInfo && <span className="text-xs opacity-70">{matchInfo}</span>}
                </div>
              </div>
            )}
                  {peerImage && (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={peerImage} alt="Peer" className="max-h-60 rounded-lg border" />
        </div>
      )}

      {showInvite && (
        <InviteQR link={`${typeof window !== 'undefined' ? window.location.origin : ''}${typeof window !== 'undefined' ? window.location.pathname : ''}?room=${encodeURIComponent(roomId)}`} onClose={() => setShowInvite(false)} />
      )}
      {showPoster && (
        <SharePoster
          data={{
            title: 'QuestBingo',
            nickname: nickname || 'guest',
            foundCount,
            lineCount,
            roomId,
            inviteLink: `${typeof window !== 'undefined' ? window.location.origin : ''}${typeof window !== 'undefined' ? window.location.pathname : ''}?room=${encodeURIComponent(roomId)}`,
          }}
          onClose={() => setShowPoster(false)}
        />
      )}
    </div>
        </section>
      ) : activeTab === 'quest' ? (
        <section>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">{t('questTitle')}</h1>
          {quest ? (
            <div className="rounded-xl border p-4 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
              <div className="text-lg font-medium">{quest.title}</div>
              <div className="text-xs opacity-70 mb-3">{quest.minutes} {t('questMinutes')}</div>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {quest.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="text-sm opacity-70">Loading…</div>
          )}

          <div className="mt-6">
            <div className="text-sm opacity-70 mb-2">Top 5 Leaderboard (lines)</div>
            <ul className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
              {leaderboard.map((e, idx) => (
                <li key={e.playerId+idx} className="rounded-md border p-2 flex items-center justify-between">
                  <div className="truncate">{e.playerId}</div>
                  <div className="opacity-70">{e.lines} lines · {e.quests} quests</div>
                </li>
              ))}
              {leaderboard.length === 0 && (
                <li className="text-xs opacity-60">No entries yet. Be the first!</li>
              )}
            </ul>
          </div>
        </section>
      ) : (
        <section>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">{t('petTitle')}</h1>
          {!nickname && <div className="text-sm opacity-70 mb-4">Set a nickname to create your pet.</div>}
          {petLoading && <div className="text-sm opacity-70">Loading…</div>}
          {pet && (
            <div className="rounded-xl border p-4 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
              <div className="flex items-center gap-3">
                <PetFace type={pet.type} />
                <div>
                  <div className="text-lg font-medium">{pet.name}</div>
                  <div className="text-xs opacity-70">{t('level')} {pet.level} · {t('streak')}: {pet.streakDays}</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xs opacity-70 mb-1">XP {pet.xp} / {pet.xpToNext}</div>
                <div className="w-full h-2 rounded bg-black/10 dark:bg-white/10">
                  <div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.min(100, Math.round((pet.xp / Math.max(1, pet.xpToNext)) * 100))}%` }} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>{t('happiness')}: {pet.happiness}</div>
                <div>{t('hunger')}: {pet.hunger}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="px-3 py-1.5 rounded-md border text-sm" onClick={async () => { if (!nickname) return; await fetch('/api/pet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'feed' }) }); await refreshPet(); }}>{t('feed')}</button>
                <button className="px-3 py-1.5 rounded-md border text-sm" onClick={async () => { if (!nickname) return; await fetch('/api/pet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'play' }) }); await refreshPet(); }}>{t('play')}</button>
                <button className="px-3 py-1.5 rounded-md border text-sm" onClick={async () => { if (!nickname) return; await fetch('/api/pet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'checkin' }) }); await refreshPet(); }}>{t('checkin')}</button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <label className="opacity-70">{t('rename')}</label>
                <input value={petNameInput} onChange={(e) => setPetNameInput(e.target.value.slice(0,24))} className="px-2 py-1 rounded border bg-transparent" />
                <button className="px-3 py-1.5 rounded-md border" onClick={async () => { if (!nickname) return; await fetch('/api/pet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'rename', name: petNameInput }) }); await refreshPet(); }}>{t('save')}</button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <label className="opacity-70">{t('type')}</label>
                <select value={petType} onChange={(e) => setPetType(e.target.value as PetType)} className="px-2 py-1 rounded border bg-transparent">
                  <option value="cat">cat</option>
                  <option value="dog">dog</option>
                  <option value="fox">fox</option>
                  <option value="panda">panda</option>
                  <option value="dragon">dragon</option>
                </select>
                <button className="px-3 py-1.5 rounded-md border" onClick={async () => { if (!nickname) return; await fetch('/api/pet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'selecttype', type: petType }) }); await refreshPet(); }}>{t('save')}</button>
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="mt-10 text-xs opacity-60">QuestBingo · Walk · Snap · Play</footer>
    </div>
  );
}
