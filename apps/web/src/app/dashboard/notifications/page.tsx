'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
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

export default function NotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadNotifications();
    }
  }, [token]);

  const loadNotifications = async () => {
    if (!token) return;
    try {
      const data = await api.getNotifications(token, { perPage: 50 });
      setNotifications(data.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const markAll = async () => {
    if (!token) return;
    try {
      await api.markAllNotificationsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch {}
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <button
          onClick={markAll}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Mark all as read
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl">🔔</p>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Sales, reviews and platform updates will show up here.
              </p>
              <div className="mt-6">
                <Link
                  href="/products"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Browse Products
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn('flex items-start gap-4 py-4', !n.readAt && 'bg-gold-400/5')}
                >
                  <span className="text-2xl leading-none">{TYPE_ICONS[n.type] || '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(n.createdAt).toLocaleString('en-NG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold-500" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
