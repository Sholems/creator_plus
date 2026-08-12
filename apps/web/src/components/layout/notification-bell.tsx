'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { cn } from '@creatormarket/ui';

const TYPE_ICONS: Record<string, string> = {
  SALE: '💰',
  PRODUCT_APPROVED: '✅',
  PRODUCT_REJECTED: '⚠️',
  NEW_REVIEW: '⭐',
  REFUND_REQUEST: '↩️',
  PAYOUT_COMPLETED: '💸',
  VERIFICATION_STATUS: '🛡️',
  SYSTEM: '🔔',
};

export function NotificationBell() {
  const { token } = useAuth();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      setUnread(0);
      setItems([]);
      return;
    }
    api
      .getUnreadNotifications(token)
      .then(setUnread)
      .catch(() => {});
  }, [token, isOpen]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggle = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && token) {
      setIsLoading(true);
      try {
        const data = await api.getNotifications(token, { perPage: 8 });
        setItems(data.data || []);
      } catch {
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleItemClick = async (n: any) => {
    if (token && !n.readAt) {
      api.markNotificationRead(token, n.id).catch(() => {});
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.data?.slug) {
      window.location.href = `/products/${n.data.slug}`;
    } else if (n.data?.orderId) {
      window.location.href = `/orders/${n.data.orderId}`;
    } else if (n.data?.productId && n.data?.slug) {
      window.location.href = `/products/${n.data.slug}`;
    }
  };

  const handleMarkAll = async () => {
    if (!token) return;
    try {
      await api.markAllNotificationsRead(token);
      setUnread(0);
      setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    } catch {}
  };

  if (!token) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggle}
        className="relative p-2 text-cream-100/80 hover:text-white"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-400 px-1 text-[0.625rem] font-bold text-forest-900">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-xl border border-ink-100 bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <p className="text-sm font-semibold text-ink-900">Notifications</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleMarkAll}
                className="text-xs font-medium text-forest-700 hover:underline"
              >
                Mark all read
              </button>
              <Link
                href="/dashboard/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-forest-700 hover:underline"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-cream-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-ink-500">You're all caught up!</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-cream-50',
                    !n.readAt && 'bg-gold-400/5',
                  )}
                >
                  <span className="text-lg leading-none">{TYPE_ICONS[n.type] || '🔔'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink-900">{n.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{n.message}</span>
                    <span className="mt-1 block text-[0.625rem] text-ink-400">
                      {new Date(n.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </span>
                  {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
