'use client';

import { useEffect, useMemo, useState } from 'react';

type BingoItem = { id: string; label: string; found: boolean };

type BingoBoardResponse = { items: BingoItem[] };

type PromptResponse = { prompt: string };

type Quest = { id: string; title: string; minutes: number; steps: string[] };

type QuestResponse = { quest: Quest };

type TabKey = 'bingo' | 'snap' | 'quest';

type Lang = 'en' | 'zh';

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    bingo: 'Bingo',
    snap: 'SnapSwap',
    quest: 'Quest',
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
  },
  zh: {
    bingo: '賓果',
    snap: '盲拍互換',
    quest: '任務',
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
  // rows
  for (let r = 0; r < 5; r++) if (grid[r].every(Boolean)) lines++;
  // cols
  for (let c = 0; c < 5; c++) if (grid.every((row) => row[c])) lines++;
  // diagonals
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

  const t = (k: string) => STRINGS[lang][k] ?? k;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('questbingo.lang', lang);
    }
  }, [lang]);

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

    loadBoard();
    loadPrompt();
    loadQuest();
  }, []);

  const foundCount = useMemo(() => board.filter((b) => b.found).length, [board]);
  const lineCount = useMemo(() => countCompletedLines(board), [board]);

  const onTileToggle = (id: string) => {
    setBoard((prev) => prev.map((t) => (t.id === id ? { ...t, found: !t.found } : t)));
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
        </div>
        <div className="flex items-center gap-1 text-sm">
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
              </div>
            )}
          </div>
        </section>
      ) : (
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
        </section>
      )}

      <footer className="mt-10 text-xs opacity-60">QuestBingo · Walk • Snap · Play</footer>
    </div>
  );
}
