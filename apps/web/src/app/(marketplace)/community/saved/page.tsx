'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MemberAvatar } from '@/components/community/member-avatar';
import { CommunityPageState } from '@/components/community/community-page-state';

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export default function SavedPostsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [posts, setPosts] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      setPosts(await api.getSavedPosts(token));
    } catch (e: any) {
      setError(e.message || 'Could not load your saved posts');
      setPosts([]);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && !token) router.push('/auth/login?redirect=/community/saved' as Route);
  }, [authLoading, token, router]);

  useEffect(() => {
    if (token) void load();
  }, [token, load]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Growth Club</p>
          <h1 className="font-display text-3xl font-bold text-ink-900">Saved posts</h1>
        </div>
        <Link href={'/community/discussion' as Route} className="text-sm text-ink-500 hover:text-ink-800">
          ← Discussion
        </Link>
      </div>

      {error && <p className="mt-4 rounded-lg bg-clay-50 px-3 py-2 text-sm text-clay-700">{error}</p>}

      {posts === null ? (
        <p className="mt-8 text-center text-sm text-ink-500">Loading…</p>
      ) : posts.length === 0 ? (
        <div className="mt-6">
          <CommunityPageState
            title="Nothing saved yet"
            message="Tap Save on any discussion to keep it here for later."
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/community/post/${p.id}` as Route}
                className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm transition hover:border-forest-200"
              >
                <MemberAvatar name={p.author?.displayName} src={p.author?.avatar} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900">{p.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {p.author?.displayName || 'A member'}
                    {p.category?.name ? ` · ${p.category.name}` : ''} · {timeAgo(p.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-ink-500">
                  <span>{p.likeCount ?? 0} ♥</span>
                  <span className="ml-2">{p.commentCount ?? 0} 💬</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
