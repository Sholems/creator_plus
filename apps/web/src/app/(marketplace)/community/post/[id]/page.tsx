'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AttachmentList } from '@/components/community/attachments';
import { CommunityRichContent } from '@/components/community/rich-content';
import { CommunityRichEditor } from '@/components/community/community-rich-editor';
import { MemberAvatar } from '@/components/community/member-avatar';

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

export default function PostThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user, isLoading: authLoading } = useAuth();
  const isAdmin = !!user?.roles?.some((r) => r === 'super_admin' || r === 'admin');

  const [post, setPost] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!token || !id) return;
    try {
      setPost(await api.getPost(token, id));
    } catch (e: any) {
      setError(e.message || 'Could not load post');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!authLoading && !token) {
      router.push(`/auth/login?redirect=/community/post/${id}` as Route);
      return;
    }
    load();
  }, [token, id, authLoading]);

  async function like() {
    if (!token) return;
    const res = await api.likePost(token, id).catch(() => null);
    if (res) setPost((p: any) => ({ ...p, likedByMe: res.likedByMe, likeCount: res.likeCount }));
  }
  async function submitComment() {
    if (!token || !comment.trim()) return;
    setBusy(true);
    try {
      const c = await api.addComment(token, id, comment.trim(), {
        contentFormat: 'RICH_HTML',
        parentId: replyingTo || undefined,
      });
      setComment('');
      setReplyingTo(null);
      setPost((p: any) => ({
        ...p,
        comments: [...p.comments, c],
        commentCount: p.commentCount + 1,
      }));
    } catch (e: any) {
      setError(e.message || 'Could not comment');
    } finally {
      setBusy(false);
    }
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
  async function toggleSave() {
    if (!token) return;
    const result = await api.saveCommunityPost(token, id);
    setPost((current: any) => ({ ...current, savedByMe: result.active }));
  }
  async function toggleSubscription() {
    if (!token) return;
    const result = await api.subscribeCommunityPost(token, id);
    setPost((current: any) => ({ ...current, subscribedByMe: result.active }));
  }
  async function acceptAnswer(commentId: string) {
    if (!token) return;
    const next = post.acceptedCommentId === commentId ? null : commentId;
    await api.acceptCommunityAnswer(token, id, next);
    setPost((current: any) => ({ ...current, acceptedCommentId: next }));
  }
  async function report(targetType: 'POST' | 'COMMENT', targetId: string) {
    if (!token) return;
    const reason = window.prompt('Why are you reporting this content?');
    if (!reason?.trim()) return;
    await api.reportCommunityContent(token, { targetType, targetId, reason: reason.trim() });
    window.alert('Thanks. The moderation team will review your report.');
  }

  if (loading)
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50">
        <p className="text-sm text-ink-500">Loading…</p>
      </main>
    );
  if (error)
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4">
        <p className="text-sm text-clay-600">{error}</p>
      </main>
    );
  if (!post) return null;

  const canDeletePost = isAdmin || post.author?.id === user?.id;

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href={'/community/discussion' as Route}
          className="text-sm text-ink-500 hover:text-ink-800"
        >
          ← Discussion
        </Link>

        <article className="mt-3 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <MemberAvatar name={post.author?.displayName} src={post.author?.avatar} size={32} />
            <span className="font-medium text-ink-700">{post.author?.displayName || 'Member'}</span>
            <span>· {timeAgo(post.createdAt)}</span>
            {post.category && (
              <span className="rounded-full bg-cream-200 px-2 py-0.5 font-semibold text-ink-600">
                {post.category.name}
              </span>
            )}
            {post.pinned && (
              <span className="rounded-full bg-gold-100 px-2 py-0.5 font-semibold text-gold-800">
                📌
              </span>
            )}
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold text-ink-900">{post.title}</h1>
          <div className="mt-3">
            <CommunityRichContent body={post.body} format={post.contentFormat} />
          </div>
          <AttachmentList attachments={post.attachments} />

          <div className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-4 text-sm">
            <button
              onClick={like}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold transition ${post.likedByMe ? 'bg-clay-50 text-clay-700' : 'border border-ink-200 text-ink-600 hover:bg-cream-100'}`}
            >
              {post.likedByMe ? '♥' : '♡'} {post.likeCount}
            </button>
            <span className="text-ink-500">💬 {post.commentCount}</span>
            <button onClick={toggleSave} className="font-semibold text-ink-600 hover:text-ink-900">
              {post.savedByMe ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={toggleSubscription}
              className="font-semibold text-ink-600 hover:text-ink-900"
            >
              {post.subscribedByMe ? 'Following' : 'Follow'}
            </button>
            <div className="ml-auto flex gap-3 text-xs">
              {!canDeletePost && (
                <button
                  onClick={() => report('POST', post.id)}
                  className="font-semibold text-ink-500 hover:underline"
                >
                  Report
                </button>
              )}
              {isAdmin && (
                <button onClick={pin} className="font-semibold text-ink-500 hover:underline">
                  {post.pinned ? 'Unpin' : 'Pin'}
                </button>
              )}
              {canDeletePost && (
                <button
                  onClick={removePost}
                  className="font-semibold text-clay-600 hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </article>

        {/* Comments */}
        <div className="mt-6">
          <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
            {replyingTo && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-cream-100 px-3 py-2 text-xs text-ink-600">
                <span>Replying to a member</span>
                <button onClick={() => setReplyingTo(null)} className="font-semibold">
                  Cancel
                </button>
              </div>
            )}
            <CommunityRichEditor
              value={comment}
              onChange={setComment}
              placeholder="Share a useful answer or perspective…"
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={submitComment}
                disabled={busy || !comment.trim()}
                className="rounded-full bg-forest-800 px-5 py-1.5 text-sm font-semibold text-cream-50 hover:bg-forest-700 disabled:opacity-50"
              >
                Comment
              </button>
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {post.comments.map((c: any) => {
              const accepted = post.acceptedCommentId === c.id;
              return (
                <li
                  key={c.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm ${accepted ? 'border-forest-400 ring-1 ring-forest-200' : 'border-ink-100'} ${c.parentId ? 'ml-8' : ''}`}
                >
                  <div className="flex items-center gap-2 text-xs text-ink-500">
                    <MemberAvatar name={c.author?.displayName} src={c.author?.avatar} size={32} />
                    <span className="font-medium text-ink-700">
                      {c.author?.displayName || 'Member'}
                    </span>
                    <span>· {timeAgo(c.createdAt)}</span>
                    {accepted && (
                      <span className="rounded-full bg-forest-100 px-2 py-0.5 font-semibold text-forest-800">
                        Accepted answer
                      </span>
                    )}
                    <button
                      onClick={() => setReplyingTo(c.id)}
                      className="ml-auto font-semibold text-ink-500 hover:underline"
                    >
                      Reply
                    </button>
                    {(post.author?.id === user?.id || isAdmin) && post.postType === 'QUESTION' && (
                      <button
                        onClick={() => acceptAnswer(c.id)}
                        className="font-semibold text-forest-700 hover:underline"
                      >
                        {accepted ? 'Unaccept' : 'Accept answer'}
                      </button>
                    )}
                    {(isAdmin || c.author?.id === user?.id) && (
                      <button
                        onClick={() => removeComment(c.id)}
                        className="ml-auto text-clay-500 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="mt-2">
                    <CommunityRichContent body={c.body} format={c.contentFormat} />
                  </div>
                  {!isAdmin && c.author?.id !== user?.id && (
                    <button
                      onClick={() => report('COMMENT', c.id)}
                      className="mt-2 text-xs font-semibold text-ink-400 hover:text-clay-600"
                    >
                      Report
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </main>
  );
}
