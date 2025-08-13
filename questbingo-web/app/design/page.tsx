export const dynamic = 'force-static';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4">
      <div className="text-sm font-medium opacity-80 mb-2">{title}</div>
      {children}
    </div>
  );
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return <button className="px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm">{children}</button>;
}

export default function Design() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">QuestBingo Design System & Screens</h1>

      <section className="grid md:grid-cols-3 gap-4">
        <Card title="Colors">
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className="h-10 rounded bg-black text-white flex items-center justify-center">#000</div>
            <div className="h-10 rounded bg-white text-black border flex items-center justify-center">#fff</div>
            <div className="h-10 rounded bg-emerald-500 text-white flex items-center justify-center">emerald</div>
            <div className="h-10 rounded bg-blue-500 text-white flex items-center justify-center">blue</div>
            <div className="h-10 rounded bg-amber-500 text-white flex items-center justify-center">amber</div>
          </div>
        </Card>
        <Card title="Typography">
          <div className="space-y-1">
            <div className="text-2xl font-semibold">H1 · Title</div>
            <div className="text-xl font-medium">H2 · Section</div>
            <div className="text-base">Body · Default</div>
            <div className="text-sm opacity-70">Caption · Secondary</div>
          </div>
        </Card>
        <Card title="Components">
          <div className="flex flex-wrap gap-2 items-center">
            <PrimaryButton>Primary</PrimaryButton>
            <button className="px-4 py-2 rounded-full border text-sm">Secondary</button>
            <button className="px-3 py-1.5 rounded-md border text-xs">Chip</button>
            <input placeholder="Text field" className="px-3 py-2 rounded-md border bg-transparent text-sm" />
          </div>
        </Card>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <Card title="Home · Tabs">
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-full border text-sm bg-black text-white dark:bg-white dark:text-black">Bingo</button>
            <button className="px-4 py-2 rounded-full border text-sm">Snap</button>
            <button className="px-4 py-2 rounded-full border text-sm">Quest</button>
            <button className="px-4 py-2 rounded-full border text-sm">Pet</button>
          </div>
          <p className="mt-3 text-sm opacity-70">Top bar with segmented tabs and app title.</p>
        </Card>

        <Card title="Bingo · 5×5 Board">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className={`h-16 rounded-xl border text-[10px] p-2 ${i % 3 === 0 ? 'bg-emerald-500/10 border-emerald-400/50' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10'}`}>Tile {i + 1}</div>
            ))}
          </div>
          <div className="mt-3 text-sm opacity-70">Progress: 12 / 25 · Lines: 3</div>
        </Card>

        <Card title="SnapSwap · Prompt & Upload">
          <div className="rounded-xl border p-4 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
            <div className="text-sm mb-2">Today’s prompt</div>
            <div className="text-lg font-medium">A splash of red</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <button className="px-3 py-1.5 rounded-md border text-sm">Choose photo</button>
            <button className="px-3 py-1.5 rounded-md border text-sm">Offer to room</button>
            <button className="px-3 py-1.5 rounded-md border text-sm">Check match</button>
          </div>
          <p className="mt-3 text-sm opacity-70">Two users in same room exchange photos anonymously.</p>
        </Card>

        <Card title="Quest · 10‑min Card & Leaderboard">
          <div className="rounded-xl border p-4 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
            <div className="text-lg font-medium">Pattern Hunter</div>
            <div className="text-xs opacity-70 mb-3">10 minutes</div>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Find a repeating pattern in the wild</li>
              <li>Frame it from 2 angles</li>
              <li>Pick your favorite and share</li>
            </ol>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-md border p-2 flex items-center justify-between">
                <div className="truncate">player{i + 1}</div>
                <div className="opacity-70">{(4 - i) * 2} lines · {i} quests</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Pet · Status & Actions">
          <div className="flex items-center gap-3">
            <div className="text-5xl">🐱</div>
            <div>
              <div className="text-lg font-medium">Buddy</div>
              <div className="text-xs opacity-70">Level 3 · Streak: 4</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs opacity-70 mb-1">XP 35 / 75</div>
            <div className="w-full h-2 rounded bg-black/10 dark:bg-white/10">
              <div className="h-2 rounded bg-emerald-500" style={{ width: '46%' }} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>Happiness: 78</div>
            <div>Hunger: 22</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="px-3 py-1.5 rounded-md border text-sm">Feed</button>
            <button className="px-3 py-1.5 rounded-md border text-sm">Play</button>
            <button className="px-3 py-1.5 rounded-md border text-sm">Check-in</button>
          </div>
        </Card>
      </section>
    </div>
  );
}