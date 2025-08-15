"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = { id: string; title: string; description?: string; variant?: 'default' | 'success' | 'error' };

type ToastContextValue = {
  notify: (t: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const item: Toast = { id, ...t };
    setToasts((prev) => [...prev, item]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3000);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-3 right-3 z-[60] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-md border px-3 py-2 text-sm shadow-md ${
            t.variant === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : t.variant === 'error' ? 'bg-rose-600 text-white border-rose-500' : 'bg-black/80 text-white border-white/10'
          }`}>
            <div className="font-medium">{t.title}</div>
            {t.description && <div className="opacity-80 text-xs">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}