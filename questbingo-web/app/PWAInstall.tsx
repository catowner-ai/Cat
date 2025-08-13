"use client";

import React, { useEffect, useState } from "react";

export default function PWAInstall() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || !installEvent) return null;

  return (
    <button
      className="px-3 py-1.5 rounded-full border text-xs"
      onClick={async () => {
        try {
          await installEvent.prompt();
          setInstallEvent(null);
        } catch {}
      }}
    >
      Install
    </button>
  );
}

// Types for TS
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}