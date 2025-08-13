"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = (window.localStorage.getItem("questbingo.theme") as Theme) || null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial: Theme = saved ?? (prefersDark ? "dark" : "light");
    apply(initial);
  }, []);

  const apply = (t: Theme) => {
    setTheme(t);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (t === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("questbingo.theme", t);
    }
  };

  return (
    <button
      aria-label="Toggle theme"
      aria-pressed={theme === 'dark'}
      className="px-3 py-1.5 rounded-full border text-xs"
      onClick={() => apply(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}