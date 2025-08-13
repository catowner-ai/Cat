'use client';

import { useEffect, useMemo, useState } from 'react';

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
  const [matchInfo, setMatchInfo] = useState<string>('');
  const [pet, setPet] = useState<Pet | null>(null);
  const [petLoading, setPetLoading] = useState<boolean>(false);
  const [petNameInput, setPetNameInput] = useState<string>('');
  const [petType, setPetType] = useState<PetType>('cat');
  const [eventsLog, setEventsLog] = useState<string[]>([]);
  const [boss, setBoss] = useState<{ id: string; title: string; type: string; threshold: number } | null>(null);
  const [guessInput, setGuessInput] = useState<string>('');
  const [bossProgress, setBossProgress] = useState<{ progress: number; ready: boolean; already: boolean } | null>(null);
  const [chatInput, setChatInput] = useState<string>('');
  const [messages, setMessages] = useState<{ id: string; playerId: string; text: string; createdAt: string }[]>([]);
  const [coins, setCoins] = useState<number>(0);
  const [equipped, setEquipped] = useState<string>('');
  const [owned, setOwned] = useState<string[]>([]);

  const t = (k: string) => STRINGS[lang][k] ?? k;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const n = window.localStorage.getItem('questbingo.nickname') || '';
      const r = window.localStorage.getItem('questbingo.room') || 'global';
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
    const loadLeaderboard = async () => {
      try {
        const res = await fetch(`/api/leaderboard?room=${encodeURIComponent(roomId)}`, { cache: 'no-store' });
        const data = await res.json();
        setLeaderboard((data.entries || []).slice(0, 5));
      } catch {}
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
    loadLeaderboard();
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
    (async () => {
      try {
        const res = await fetch(`/api/leaderboard?room=${encodeURIComponent(roomId)}`, { cache: 'no-store' });
        const data = await res.json();
        setLeaderboard((data.entries || []).slice(0, 5));
      } catch {}
    })();
  }, [roomId]);

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

  useEffect(() => {
    // Boss of the day
    fetch('/api/boss').then((r) => r.json()).then((d) => setBoss(d.boss)).catch(() => {});
    // Load recent chat
    fetch(`/api/chat?room=${encodeURIComponent(roomId)}`).then((r)=>r.json()).then((d)=> setMessages(d.messages || [])).catch(()=>{});
    // Load wallet
    if (nickname) fetch(`/api/wallet?playerId=${encodeURIComponent(nickname)}`).then((r)=>r.json()).then((d)=>{ setCoins(d.wallet?.coins ?? 0); setEquipped(d.wallet?.equipped ?? ''); setOwned(d.wallet?.cosmetics ?? []); }).catch(()=>{});
  }, []);

  useEffect(() => {
    // SSE subscribe
    const url = `/api/events?room=${encodeURIComponent(roomId)}&playerId=${encodeURIComponent(nickname || 'guest')}`;
    const es = new EventSource(url);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        setEventsLog((prev) => [JSON.stringify(data), ...prev].slice(0, 5));
        if (data.type === 'leaderboard') {
          // refresh leaderboard
          fetch(`/api/leaderboard?room=${encodeURIComponent(roomId)}`).then((r) => r.json()).then((d) => setLeaderboard((d.entries || []).slice(0,5))).catch(() => {});
        } else if (data.type === 'chat' && data.message) {
          setMessages((prev)=> [...prev.slice(-49), data.message]);
        }
      } catch {}
    };
    es.onerror = () => {};
    return () => es.close();
  }, [roomId, nickname]);

  useEffect(() => {
    // refresh boss progress on nickname/room changes
    if (!nickname) return;
    fetch(`/api/boss/progress?playerId=${encodeURIComponent(nickname)}&roomId=${encodeURIComponent(roomId)}`)
      .then((r) => r.json())
      .then((d) => setBossProgress({ progress: d.progress ?? 0, ready: !!d.ready, already: !!d.already }))
      .catch(() => {});
  }, [nickname, roomId]);

  const foundCount = useMemo(() => board.filter((b) => b.found).length, [board]);
  const lineCount = useMemo(() => countCompletedLines(board), [board]);

  const refreshPet = async () => {
    if (!nickname) return;
    const r = await fetch(`/api/pet?playerId=${encodeURIComponent(nickname)}`);
    const d: PetResponse = await r.json();
    setPet(d.pet);
  };

  const onTileToggle = (id: string) => {
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
      // small pet reward for exploration
      if (nickname) {
        fetch('/api/pet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: nickname, action: 'grant', xp: 1, happiness: 1 }),
        }).then(refreshPet).catch(() => {});
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

  const onImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
    }
  };

  const spinLucky = () => {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 1200);
  };

  const PetFace = ({ type }: { type: PetType }) => {
    const map: Record<PetType, string> = {
      cat: '🐱',
      dog: '🐶',
      fox: '🦊',
      panda: '🐼',
      dragon: '🐲',
    };
    const style: React.CSSProperties | undefined = equipped === 'glow' ? ({ textShadow: '0 0 10px rgba(16,185,129,0.8)' } as React.CSSProperties) : undefined;
    return <span style={{ fontSize: 48, ...style }}>{map[type] || '🐾'}</span>;
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
        </div>
        <div className="flex items-center gap-1 text-sm">
          <input value={nickname} onChange={(e) => setNickname(e.target.value.slice(0,24))} placeholder="nickname" className="px-2 py-1 rounded border bg-transparent" />
          <input value={roomId} onChange={(e) => setRoomId(e.target.value.slice(0,32))} placeholder="room" className="px-2 py-1 rounded border bg-transparent w-28" />
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
                  className={`h-24 p-2 rounded-xl border text-left text-xs transition ${
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
            <button onClick={onShare} className="px-3 py-1.5 rounded-md border">
              {t('share')}
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
            <input type="file" accept="image/*" onChange={onImageSelect} />
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
              <div className="mt-4 space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={peerImage} alt="Peer" className="max-h-60 rounded-lg border" />
                <div className="flex items-center gap-2">
                  <input className="px-2 py-1 rounded border bg-transparent text-sm" placeholder="Guess author nickname" value={guessInput} onChange={(e) => setGuessInput(e.target.value)} />
                  <button className="px-3 py-1.5 rounded-md border text-sm" onClick={async () => {
                    const r = await fetch('/api/snapswap/guess', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname || 'guest', roomId, guess: guessInput }) });
                    const d = await r.json();
                    if (d.correct) {
                      setMatchInfo('Correct! Partner is ' + d.partner.playerId);
                      if (nickname) {
                        fetch('/api/pet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'grant', xp: 12, happiness: 5 }) }).then(refreshPet).catch(() => {});
                      }
                    } else {
                      setMatchInfo('Wrong guess, try again.');
                    }
                  }}>Guess</button>
                  <button className="px-3 py-1.5 rounded-md border text-sm" onClick={async ()=>{
                    await fetch('/api/snapswap/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname || 'guest', roomId, image: peerImage, note: 'inappropriate' }) });
                    alert('Reported. Thanks!');
                  }}>Report</button>
                </div>
              </div>
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
          <div className="mt-6 rounded-xl border p-4 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
            <div className="text-sm opacity-70 mb-1">Boss of the day</div>
            <div className="text-sm">{boss ? boss.title : 'Loading…'}</div>
            {boss && (
              <div className="mt-2">
                <div className="text-xs opacity-70 mb-1">Progress {bossProgress?.progress ?? 0} / {boss.threshold}</div>
                <div className="w-full h-2 rounded bg-black/10 dark:bg-white/10">
                  <div className="h-2 rounded bg-indigo-500" style={{ width: `${Math.min(100, Math.round(((bossProgress?.progress ?? 0)/Math.max(1,boss.threshold))*100))}%` }} />
                </div>
              </div>
            )}
            <button className="mt-2 px-3 py-1.5 rounded-md border text-sm" onClick={async () => {
              if (!boss) return;
              const r = await fetch('/api/boss/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname || 'guest', roomId, bossId: boss.id }) });
              const d = await r.json();
              if (d.ok) {
                alert('Claimed rewards!');
                await refreshPet();
                fetch(`/api/boss/progress?playerId=${encodeURIComponent(nickname)}&roomId=${encodeURIComponent(roomId)}`).then((r)=>r.json()).then((dd)=> setBossProgress({progress: dd.progress??0, ready: !!dd.ready, already: !!dd.already})).catch(()=>{});
              } else {
                alert('Not ready: ' + (d.reason || 'unknown'));
              }
            }} disabled={!bossProgress?.ready || bossProgress?.already}>
              {bossProgress?.already ? 'Already claimed' : (bossProgress?.ready ? 'Claim' : 'Not ready')}
            </button>
          </div>
          <div className="mt-6 rounded-xl border p-4 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
            <div className="text-sm opacity-70 mb-2">Room chat</div>
            <div className="max-h-48 overflow-auto space-y-1 text-sm mb-2">
              {messages.map((m)=> (
                <div key={m.id} className="flex gap-2"><span className="opacity-60">{m.playerId}:</span><span>{m.text}</span></div>
              ))}
              {messages.length===0 && <div className="text-xs opacity-60">No messages</div>}
            </div>
            <div className="flex items-center gap-2">
              <input className="px-2 py-1 rounded border bg-transparent text-sm flex-1" placeholder="Say something…" value={chatInput} onChange={(e)=> setChatInput(e.target.value)} />
              <button className="px-3 py-1.5 rounded-md border text-sm" onClick={async ()=>{
                if (!chatInput.trim()) return;
                await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, playerId: nickname || 'guest', text: chatInput.trim() }) });
                setChatInput('');
              }}>Send</button>
            </div>
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
                <button className="px-3 py-1.5 rounded-md border text-sm" onClick={async () => { if (!nickname) return; await fetch('/api/pet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: nickname, action: 'treat' }) }); await refreshPet(); }}>Treat</button>
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
              <div className="mt-4 rounded-md border p-3">
                <div className="text-sm mb-2">Wallet · Coins: {coins}</div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 rounded border text-xs" onClick={async ()=>{ if(!nickname) return; await fetch('/api/wallet', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'grant', playerId: nickname, coins: 10 }) }); const r = await fetch(`/api/wallet?playerId=${encodeURIComponent(nickname)}`); const d = await r.json(); setCoins(d.wallet?.coins ?? 0); }}>+10 coins</button>
                  <button className="px-2 py-1 rounded border text-xs" onClick={async ()=>{ if(!nickname) return; // buy glow cosmetic for 50 coins
                    if (coins < 50) { alert('Not enough coins'); return; }
                    await fetch('/api/wallet', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'buy', playerId: nickname, kind: 'cosmetic', itemId: 'glow' }) });
                    const r1 = await fetch(`/api/wallet?playerId=${encodeURIComponent(nickname)}`); const d1 = await r1.json(); setCoins(d1.wallet?.coins ?? 0); setOwned(d1.wallet?.cosmetics ?? []);
                  }}>Buy Glow (50)</button>
                  <button className="px-2 py-1 rounded border text-xs" onClick={async ()=>{ if(!nickname) return; setEquipped('glow'); await fetch('/api/wallet', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'equip', playerId: nickname, cosmetic: 'glow' }) }); }}>Equip Glow</button>
                </div>
                <div className="mt-3">
                  <div className="text-xs opacity-70 mb-1">Shop · Cosmetics</div>
                  <div className="flex gap-2 flex-wrap">
                    {['glow','sparkle','shadow','rainbow'].map((c)=> (
                      <button key={c} className="px-2 py-1 rounded border text-xs" onClick={async ()=>{ if(!nickname) return; await fetch('/api/wallet', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'buy', playerId: nickname, kind: 'cosmetic', itemId: c }) }); const r = await fetch(`/api/wallet?playerId=${encodeURIComponent(nickname)}`); const d = await r.json(); setCoins(d.wallet?.coins ?? 0); setOwned(d.wallet?.cosmetics ?? []); }}>Buy {c}</button>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xs opacity-70 mb-1">Shop · Stickers</div>
                  <div className="flex gap-2 flex-wrap">
                    {['hi','gg','lul','wow'].map((s)=> (
                      <button key={s} className="px-2 py-1 rounded border text-xs" onClick={async ()=>{ if(!nickname) return; await fetch('/api/wallet', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'buy', playerId: nickname, kind: 'sticker', itemId: s }) }); const r = await fetch(`/api/wallet?playerId=${encodeURIComponent(nickname)}`); const d = await r.json(); setCoins(d.wallet?.coins ?? 0); }}>Buy {s}</button>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xs opacity-70 mb-1">Owned cosmetics: {owned.join(', ') || 'none'}</div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="mt-10 text-xs opacity-60">QuestBingo · Walk · Snap · Play</footer>
      {eventsLog.length > 0 && (
        <div className="mt-4 text-xs opacity-60">
          Events: {eventsLog.join(' | ')}
        </div>
      )}
    </div>
  );
}
