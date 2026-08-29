'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@creatorplus/ui';

interface AffiliateLink {
  id: string;
  code: string;
  url: string;
  status: string;
  clickCount?: number;
  createdAt: string;
  product?: { id: string; title: string; slug: string; thumbnail?: string | null; price?: number | string };
}

const copyText = async (text: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text).catch(() => {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      });
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    return true;
  } catch {
    return false;
  }
};

export default function AffiliateProductsPage() {
  const { token } = useAuth();
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLinks(await api.getAffiliateLinks(token));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load your links');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const copyLink = async (link: AffiliateLink) => {
    const ok = await copyText(link.url);
    if (ok) {
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 1600);
    }
  };

  const toggle = async (link: AffiliateLink) => {
    if (!token) return;
    try {
      const updated = await api.updateAffiliateLink(token, link.id, {
        status: link.status === 'ACTIVE',
      });
      setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, status: updated.status } : l)));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update link');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-cream-100" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-gold-600">My links</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
            Your affiliate links
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Every link you generate is tracked — clicks, sales and commissions roll up here.
          </p>
        </div>
        <Link
          href="/affiliate/marketplace"
          className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-700"
        >
          + Generate a link
        </Link>
      </div>

      {message && (
        <p className="mt-6 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-700">
          {message}
        </p>
      )}

      <div className="mt-8 space-y-3">
        {links.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 py-20 text-center">
            <p className="font-display text-lg font-semibold text-ink-900">No links yet</p>
            <p className="mt-1 text-sm text-ink-500">
              Head to the marketplace and generate your first tracked link.
            </p>
            <Link
              href="/affiliate/marketplace"
              className="mt-5 inline-block rounded-full bg-forest-800 px-6 py-2.5 text-sm font-semibold text-cream-50 hover:bg-forest-700"
            >
              Browse the marketplace
            </Link>
          </div>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {link.product?.thumbnail ? (
                  <img src={link.product.thumbnail} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cream-100 text-lg">
                    📦
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    href={`/products/${link.product?.slug}`}
                    className="line-clamp-1 text-sm font-semibold text-ink-900 hover:text-forest-700"
                  >
                    {link.product?.title ?? 'Product'}
                  </Link>
                  <code className="block truncate font-mono text-xs text-ink-400">{link.url}</code>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {link.clickCount ?? 0} clicks · created{' '}
                    {new Date(link.createdAt).toLocaleDateString('en-NG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium',
                    link.status === 'ACTIVE'
                      ? 'bg-forest-50 text-forest-700'
                      : 'bg-cream-100 text-ink-500',
                  )}
                >
                  {link.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                </span>
                <button
                  onClick={() => copyLink(link)}
                  className="rounded-full border border-ink-200 px-4 py-1.5 text-xs font-semibold text-ink-700 hover:bg-cream-100"
                >
                  {copiedId === link.id ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => toggle(link)}
                  className="rounded-full border border-ink-200 px-4 py-1.5 text-xs font-semibold text-ink-700 hover:bg-cream-100"
                >
                  {link.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
