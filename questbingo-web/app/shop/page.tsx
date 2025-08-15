"use client";

import { useEffect, useState } from "react";

export default function ShopPage() {
  const [nickname, setNickname] = useState<string>("");
  const [coins, setCoins] = useState<number>(0);
  const cosmetics = [
    { id: "glow", label: "Glow", price: 50 },
    { id: "sparkle", label: "Sparkle", price: 80 },
    { id: "shadow", label: "Shadow", price: 60 },
    { id: "rainbow", label: "Rainbow", price: 120 },
  ];
  const stickers = [
    { id: "hi", label: "Hi 👋", price: 10 },
    { id: "gg", label: "GG 🏆", price: 10 },
    { id: "lul", label: "LOL 😆", price: 10 },
    { id: "wow", label: "Wow 🤯", price: 15 },
  ];

  useEffect(() => {
    const n = window.localStorage.getItem("questbingo.nickname") || "";
    setNickname(n);
    if (n) reloadWallet(n);
  }, []);

  const reloadWallet = async (n: string) => {
    const r = await fetch(`/api/wallet?playerId=${encodeURIComponent(n)}`);
    const d = await r.json();
    setCoins(d.wallet?.coins ?? 0);
  };

  const buy = async (kind: "cosmetic" | "sticker", id: string, price: number) => {
    if (!nickname) return alert("Set nickname on Home first");
    if (coins < price) return alert("Not enough coins");
    await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "buy", playerId: nickname, kind, itemId: id }) });
    await reloadWallet(nickname);
    alert(`Purchased ${kind}:${id}!`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Shop</h1>
      <p className="text-sm opacity-75 mb-4">Coins: <span className="font-medium">{coins}</span></p>

      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Cosmetics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cosmetics.map((c) => (
            <button key={c.id} className="rounded-md border p-3 text-left" onClick={() => buy("cosmetic", c.id, c.price)}>
              <div className="font-medium">{c.label}</div>
              <div className="text-xs opacity-60">{c.price} coins</div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Stickers</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stickers.map((s) => (
            <button key={s.id} className="rounded-md border p-3 text-left" onClick={() => buy("sticker", s.id, s.price)}>
              <div className="font-medium">{s.label}</div>
              <div className="text-xs opacity-60">{s.price} coins</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}