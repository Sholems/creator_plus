'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const input = 'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm';

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export default function DiscussionPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const isAdmin = !!user?.roles?.some((r) => r === 'super_admin' || r === 'admin');

  const [categories, setCategories] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState<string>('');
  const [posts, setPosts] = useState<any[]>([]);
  const [composer, setComposer] = useState({ title: '', body: '', categoryId: '' });
  const [showComposer, setShowComposer] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadPosts = useCallback(async (cat: string) => {
    if (!token) return;
    try {
      setPosts(await api.getPosts(token, { categoryId: cat || undefined }));
    } catch (e: any) {
      if (String(e.message || '').toLowerCase().includes('membership')) router.push('/community/join' as Route);
      else setError(e.message || 'Could not load posts');
    }
  }, [token, router]);

  useEffect(() => {
    if (!token) return;
    api.getCommunityCategories(token).then(setCategories).catch(() => {});
    loadPosts('');
  }, [token, loadPosts]);

  async function submitPost() {
    if (!token || !composer.title.trim() || !composer.body.trim()) return;
    setBusy(true); setError('');
    try {
      await api.createPost(token, { title: composer.title.trim(), body: composer.body.trim(), categoryId: composer.categoryId || undefined });
      setComposer({ title: '', body: '', categoryId: '' });
      setShowComposer(false);
      await loadPosts(activeCat);
    } catch (e: any) { setError(e.message || 'Could not post'); } finally { setBusy(false); }
  }

  async function addCategory() {
    if (!token || !newCategory.trim()) return;
    try {
      await api.createCommunityCategory(token, { name: newCategory.trim() });
      setNewCategory('');
      setCategories(await api.getCommunityCategories(token));
    } catch (e: any) { setError(e.message || 'Could not add channel'); }
  }

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow text-gold-600">Community</p>
            <h1 className="font-display text-3xl font-bold text-ink-900">Discussion</h1>
          </div>
          <Link href="/community" className="text-sm text-ink-500 hover:text-ink-800">← Community</Link>
        </div>

        {/* Channels */}
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => { setActiveCat(''); loadPosts(''); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!activeCat ? 'bg-forest-800 text-cream-50' : 'border border-ink-200 text-ink-600 hover:bg-cream-100'}`}>All</button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => { setActiveCat(c.id); loadPosts(c.id); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeCat === c.id ? 'bg-forest-800 text-cream-50' : 'border border-ink-200 text-ink-600 hover:bg-cream-100'}`}>{c.name}</button>
          ))}
          {isAdmin && (
            <span className="flex items-center gap-1">
              <input className="w-28 rounded-full border border-ink-200 px-3 py-1.5 text-xs" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="+ channel" />
              <button onClick={addCategory} className="rounded-full border border-ink-200 px-2 py-1.5 text-xs font-semibold text-ink-700 hover:bg-cream-100">Add</button>
            </span>
          )}
        </div>

        {/* Composer */}
        <div className="mt-5">
          {showComposer ? (
            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
              <input className={input} value={composer.title} onChange={(e) => setComposer({ ...composer, title: e.target.value })} placeholder="Post title" />
              <textarea className={`${input} mt-2`} rows={4} value={composer.body} onChange={(e) => setComposer({ ...composer, body: e.target.value })} placeholder="Share something with the community…" />
              <div className="mt-2 flex items-center gap-2">
                <select className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-sm" value={composer.categoryId} onChange={(e) => setComposer({ ...composer, categoryId: e.target.value })}>
                  <option value="">No channel</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => setShowComposer(false)} className="rounded-full border border-ink-200 px-4 py-1.5 text-sm font-semibold text-ink-700 hover:bg-cream-100">Cancel</button>
                  <button onClick={submitPost} disabled={busy} className="rounded-full bg-forest-800 px-5 py-1.5 text-sm font-semibold text-cream-50 hover:bg-forest-700 disabled:opacity-50">Post</button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowComposer(true)} className="w-full rounded-full border border-ink-200 bg-white px-5 py-3 text-left text-sm text-ink-400 hover:bg-cream-100">Start a discussion…</button>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-clay-600">{error}</p>}

        {/* Posts */}
        <div className="mt-6 space-y-3">
          {posts.length === 0 && <p className="rounded-2xl border border-ink-100 bg-white p-6 text-center text-sm text-ink-500">No posts yet. Be the first to start a conversation.</p>}
          {posts.map((post) => (
            <Link key={post.id} href={`/community/post/${post.id}` as Route} className="block rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition hover:border-forest-200">
              <div className="flex items-center gap-2 text-xs text-ink-500">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest-100 text-[10px] font-bold text-forest-800">{(post.author?.displayName || '?').slice(0, 1).toUpperCase()}</span>
                <span className="font-medium text-ink-700">{post.author?.displayName || 'Member'}</span>
                <span>· {timeAgo(post.createdAt)}</span>
                {post.category && <span className="rounded-full bg-cream-200 px-2 py-0.5 font-semibold text-ink-600">{post.category.name}</span>}
                {post.pinned && <span className="rounded-full bg-gold-100 px-2 py-0.5 font-semibold text-gold-800">📌 Pinned</span>}
              </div>
              <h3 className="mt-2 font-display text-lg font-semibold text-ink-900">{post.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-ink-600">{post.body}</p>
              <div className="mt-3 flex gap-4 text-xs text-ink-500">
                <span>♥ {post.likeCount}</span>
                <span>💬 {post.commentCount}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
