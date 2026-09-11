'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function CommunityHomePage() {
  const { token, isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<any>(null);
  const [welcome, setWelcome] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [note, setNote] = useState('');
  const [courses, setCourses] = useState<any[]>([]);

  const isAdmin = !!user?.roles?.some((r) => r === 'super_admin' || r === 'admin');

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('welcome')) {
      setWelcome(true);
    }
  }, []);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.getMyMembership(token)
      .then(async (m) => {
        setMembership(m);
        if (m.active) {
          try { setCourses(await api.getCourses(token)); } catch { /* ignore */ }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function cancel() {
    if (!token) return;
    setCanceling(true);
    try {
      await api.cancelMembership(token);
      setNote('Your membership will not renew. You keep access until the end of your current period.');
      const m = await api.getMyMembership(token);
      setMembership(m);
    } catch (e: any) {
      setNote(e.message || 'Could not cancel');
    } finally {
      setCanceling(false);
    }
  }

  const active = membership?.active;

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-cream-50"><p className="text-sm text-ink-500">Loading…</p></main>;
  }

  // Not a member (or signed out) → sell the membership.
  if (!active) {
    return (
      <main className="min-h-screen bg-cream-50 px-4 py-16">
        <section className="mx-auto max-w-xl text-center">
          <p className="eyebrow text-gold-600">Community</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-ink-900">Members-only community</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-600">
            Get every course, lesson, and discussion in one place. One membership, all access.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href={'/community/join' as Route} className="rounded-full bg-forest-800 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-forest-700">
              View membership
            </Link>
            {!isAuthenticated && (
              <Link href="/auth/login?redirect=/community" className="rounded-full border border-ink-200 px-6 py-3 text-sm font-semibold text-ink-700 hover:bg-cream-100">
                Sign in
              </Link>
            )}
          </div>
        </section>
      </main>
    );
  }

  // Active member → the community home (content lands in the next phase).
  const sub = membership.subscription;
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-10">
      <section className="mx-auto w-full max-w-3xl">
        {welcome && (
          <div className="mb-6 rounded-2xl border border-forest-200 bg-forest-50 px-5 py-4 text-sm text-forest-800">
            🎉 Welcome in, {user?.displayName || 'member'}! Your membership is active.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow text-gold-600">Community</p>
            <h1 className="font-display text-3xl font-bold text-ink-900">Members area</h1>
          </div>
          <span className="rounded-full bg-forest-100 px-3 py-1 text-xs font-semibold text-forest-800">
            {sub?.status === 'PAST_DUE' ? 'Payment retrying' : 'Active member'}
          </span>
        </div>

        {/* Classroom */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink-900">Classroom</h2>
          {isAdmin && (
            <Link href={'/community/manage' as Route} className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-cream-100">
              Manage
            </Link>
          )}
        </div>
        {courses.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-ink-100 bg-white p-6 text-sm text-ink-500 shadow-sm">
            {isAdmin ? 'No courses yet — use Manage to add your first course.' : 'No courses published yet. Check back soon.'}
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {courses.map((c) => {
              const pct = c.lessonCount ? Math.round((c.completedCount / c.lessonCount) * 100) : 0;
              return (
                <Link key={c.id} href={`/community/course/${c.slug}` as Route} className="group rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition hover:border-forest-200">
                  {c.coverImage && <img src={c.coverImage} alt="" className="mb-3 h-32 w-full rounded-xl object-cover" />}
                  <h3 className="font-display text-lg font-semibold text-ink-900 group-hover:text-forest-800">{c.title}</h3>
                  {c.description && <p className="mt-1 line-clamp-2 text-sm text-ink-500">{c.description}</p>}
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-100">
                      <div className="h-full bg-forest-600 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-ink-500">{c.completedCount}/{c.lessonCount} lessons · {pct}%</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Discussion */}
        <Link href={'/community/discussion' as Route} className="mt-6 block rounded-2xl border border-ink-100 bg-white p-6 shadow-sm transition hover:border-forest-200">
          <h2 className="font-display text-lg font-semibold text-ink-900">Discussion</h2>
          <p className="mt-1 text-sm text-ink-500">Ask questions, share wins, and talk with other members →</p>
        </Link>

        {/* Membership management */}
        <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-ink-900">Your membership</h2>
          {sub && (
            <p className="mt-1 text-sm text-ink-600">
              {sub.amount != null && `${sub.currency} ${Number(sub.amount).toLocaleString()} / ${sub.interval === 'MONTHLY' ? 'month' : 'year'}`}
              {sub.currentPeriodEnd && ` · ${sub.cancelAtPeriodEnd ? 'ends' : 'renews'} ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`}
            </p>
          )}
          {note && <p className="mt-3 rounded-lg bg-cream-100 px-3 py-2 text-xs text-ink-600">{note}</p>}
          {sub && !sub.cancelAtPeriodEnd && (
            <button onClick={cancel} disabled={canceling} className="mt-4 rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-cream-100 disabled:opacity-50">
              {canceling ? 'Cancelling…' : 'Cancel membership'}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
