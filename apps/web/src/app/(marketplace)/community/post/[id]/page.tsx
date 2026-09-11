'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function Avatar({ name }: { name?: string }) {
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-100 text-xs font-bold text-forest-800">{(name || '?').slice(0, 1).toUpperCase()}</span>;
}

export default function PostThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const isAdmin = !!user?.roles?.some((r) => r === 'super_admin' || r === 'admin');

  const [post, setPost] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!token || !id) return;
    try {
      setPost(await api.getPost(token, id));
    } catch (e: any) {
      if (String(e.message || '').toLowerCase().includes('membership')) router.push('/community/join' as Route);
      else setError(e.message || 'Could not load post');
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [token, id]);

  async function like() {
    if (!token) return;
    const res = await api.likePost(token, id).catch(() => null);
    if (res) setPost((p: any) => ({ ...p, likedByMe: res.likedByMe, likeCount: res.likeCount }));
  }
  async function submitComment() {
    if (!token || !comment.trim()) return;
    setBusy(true);
    try {
      const c = await api.addComment(token, id, comment.trim());
      setComment('');
      setPost((p: any) => ({ ...p, comments: [...p.comments, c], commentCount: p.commentCount + 1 }));
    } catch (e: any) { setError(e.message || 'Could not comment'); } finally { setBusy(false); }
  }
  async function removeComment(cid: string) {
    if (!token) return;
    await api.deleteComment(token, cid).catch(() => {});
    setPost((p: any) => ({ ...p, comments: p.comments.filter((c: any) => c.id !== cid) }));
  }
  async function removePost() {
    if (!token || !confirm('Delete this post?')) return;
    await api.deletePost(token, id).catch(() => {});
    router.push('/community/discussion' as Route);
  }
  async function pin() {
    if (!token) return;
    await api.pinPost(token, id, !post.pinned).catch(() => {});
    setPost((p: any) => ({ ...p, pinned: !p.pinned }));
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-cream-50"><p className="text-sm text-ink-500">Loading…</p></main>;
  if (error) return <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4"><p className="text-sm text-clay-600">{error}</p></main>;
  if (!post) return null;

  const canDeletePost = isAdmin || post.author?.id === user?.id;

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <Link href={'/community/discussion' as Route} className="text-sm text-ink-500 hover:text-ink-800">← Discussion</Link>

        <article className="mt-3 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <Avatar name={post.author?.displayName} />
            <span className="font-medium text-ink-700">{post.author?.displayName || 'Member'}</span>
            <span>· {timeAgo(post.createdAt)}</span>
            {post.category && <span className="rounded-full bg-cream-200 px-2 py-0.5 font-semibold text-ink-600">{post.category.name}</span>}
            {post.pinned && <span className="rounded-full bg-gold-100 px-2 py-0.5 font-semibold text-gold-800">📌</span>}
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold text-ink-900">{post.title}</h1>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-800">{post.body}</div>

          <div className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-4 text-sm">
            <button onClick={like} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold transition ${post.likedByMe ? 'bg-clay-50 text-clay-700' : 'border border-ink-200 text-ink-600 hover:bg-cream-100'}`}>
              {post.likedByMe ? '♥' : '♡'} {post.likeCount}
            </button>
            <span className="text-ink-500">💬 {post.commentCount}</span>
            <div className="ml-auto flex gap-3 text-xs">
              {isAdmin && <button onClick={pin} className="font-semibold text-ink-500 hover:underline">{post.pinned ? 'Unpin' : 'Pin'}</button>}
              {canDeletePost && <button onClick={removePost} className="font-semibold text-clay-600 hover:underline">Delete</button>}
            </div>
          </div>
        </article>

        {/* Comments */}
        <div className="mt-6">
          <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
            <textarea className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment…" />
            <div className="mt-2 flex justify-end">
              <button onClick={submitComment} disabled={busy || !comment.trim()} className="rounded-full bg-forest-800 px-5 py-1.5 text-sm font-semibold text-cream-50 hover:bg-forest-700 disabled:opacity-50">Comment</button>
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {post.comments.map((c: any) => (
              <li key={c.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <Avatar name={c.author?.displayName} />
                  <span className="font-medium text-ink-700">{c.author?.displayName || 'Member'}</span>
                  <span>· {timeAgo(c.createdAt)}</span>
                  {(isAdmin || c.author?.id === user?.id) && (
                    <button onClick={() => removeComment(c.id)} className="ml-auto text-clay-500 hover:underline">Delete</button>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-800">{c.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
