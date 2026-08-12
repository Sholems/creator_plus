'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextType {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 1;

const STYLES: Record<ToastKind, string> = {
  success: 'border-forest-600/30 bg-forest-50 text-forest-800',
  error: 'border-clay-500/30 bg-clay-50 text-clay-600',
  info: 'border-gold-500/30 bg-gold-50 text-ink-900',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismiss = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg shadow-ink-900/10 ${STYLES[t.kind]}`}
          >
            <span>{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-ink-400 transition-colors hover:text-ink-900"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
