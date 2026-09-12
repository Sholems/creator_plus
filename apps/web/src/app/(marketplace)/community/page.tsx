'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Markdown } from '@/components/community/markdown';

const MEMBER_BENEFITS = [
  { title: 'CreatorPlus-built courses', text: 'Structured lessons from the CreatorPlus team, with rich text, video, and downloadable resources in one classroom.' },
  { title: 'Office-hour style discussion', text: 'Ask questions, share blockers, and get practical answers from CreatorPlus and other serious members.' },
  { title: 'Growth playbooks', text: 'Short, usable content around offers, selling, content, digital products, and audience growth.' },
  { title: 'Member-only accountability', text: 'Track learning progress, earn points, and stay visible with levels and the member leaderboard.' },
];

const CLUB_FLOW = [
  'Learn from exclusive courses',
  'Ask questions in the discussion room',
  'Apply the ideas to your business',
  'Return with wins, blockers, and feedback',
];

export default function CommunityHomePage() {
  const { token, isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<any>(null);
  const [welcome, setWelcome] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [note, setNote] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

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
        if (m.active || isAdmin) {
          try { setCourses(await api.getCourses(token)); } catch { /* ignore */ }
          try { setStats(await api.getCommunityStats(token)); } catch { /* ignore */ }
          try { setLeaderboard(await api.getLeaderboard(token)); } catch { /* ignore */ }
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
      setNote('Your Growth Club membership will not renew. You keep access until the end of your current period.');
      const m = await api.getMyMembership(token);
      setMembership(m);
    } catch (e: any) {
      setNote(e.message || 'Could not cancel');
    } finally {
      setCanceling(false);
    }
  }

  const active = membership?.active || isAdmin;

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-cream-50"><p className="text-sm text-ink-500">Loading…</p></main>;
  }

  // Not a member (or signed out) → sell the membership.
  if (!active) {
    return (
      <main className="min-h-screen overflow-hidden bg-cream-50">
        <section className="relative border-b border-ink-100 px-4 py-16 sm:py-20">
          <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_20%_10%,rgba(232,180,58,0.24),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(16,61,46,0.16),transparent_30%)]" />
          <div className="relative mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gold-200 bg-white/70 px-3 py-1 text-xs font-semibold text-gold-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-gold-400" />
                Official CreatorPlus members club
              </div>
              <h1 className="mt-5 max-w-3xl font-display text-5xl font-bold leading-[0.95] tracking-tight text-ink-900 sm:text-6xl lg:text-7xl">
                Grow with better ideas, clearer execution, and a serious room.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-ink-600 sm:text-lg">
                Bold Ideas Growth Club is the paid CreatorPlus learning community for creators, entrepreneurs, and digital sellers who want practical courses, member Q&A, and guided discussion in one focused space.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={'/community/join' as Route} className="inline-flex items-center justify-center rounded-full bg-forest-800 px-7 py-3.5 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-forest-700">
                  See membership plans
                </Link>
                {!isAuthenticated && (
                  <Link href="/auth/login?redirect=/community" className="inline-flex items-center justify-center rounded-full border border-ink-200 bg-white/70 px-7 py-3.5 text-sm font-semibold text-ink-700 transition hover:bg-white">
                    Sign in
                  </Link>
                )}
              </div>
              <div className="mt-8 grid max-w-2xl gap-3 text-sm text-ink-600 sm:grid-cols-3">
                {['Courses', 'Discussion', 'Q&A support'].map((item) => (
                  <div key={item} className="rounded-2xl border border-ink-100 bg-white/75 px-4 py-3 shadow-sm">
                    <span className="text-forest-700">✓</span> {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-forest-900/10 bg-forest-900 p-5 text-cream-50 shadow-2xl shadow-forest-900/20">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.08] p-5">
                <p className="eyebrow text-gold-300">Inside the club</p>
                <div className="mt-5 space-y-3">
                  {CLUB_FLOW.map((step, index) => (
                    <div key={step} className="flex gap-3 rounded-2xl bg-white/[0.08] p-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-400 font-mono text-xs font-bold text-forest-950">
                        {index + 1}
                      </span>
                      <p className="text-sm font-medium leading-6 text-cream-100">{step}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl bg-gold-400 p-4 text-forest-950">
                  <p className="text-sm font-bold">Built for action, not noise.</p>
                  <p className="mt-1 text-xs leading-5 text-forest-900/80">The club is platform-owned, curated by CreatorPlus, and available only to paying members.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14">
          <div className="mx-auto w-full max-w-6xl">
            <div className="max-w-2xl">
              <p className="eyebrow text-gold-600">Member benefits</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-ink-900 sm:text-4xl">What members get inside</h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {MEMBER_BENEFITS.map((benefit) => (
                <div key={benefit.title} className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
                  <h3 className="font-display text-xl font-semibold text-ink-900">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ink-600">{benefit.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-16">
          <div className="mx-auto grid w-full max-w-6xl gap-6 rounded-[2rem] border border-ink-100 bg-white p-6 shadow-sm md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <p className="eyebrow text-gold-600">Ready when you are</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-ink-900">Join the club before the next lesson drops.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-600">Membership unlocks the classroom, discussion room, resources, and future Growth Club content under one subscription.</p>
            </div>
            <Link href={'/community/join' as Route} className="inline-flex items-center justify-center rounded-full bg-forest-800 px-7 py-3.5 text-sm font-semibold text-cream-50 hover:bg-forest-700">
              View pricing
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // Active member → the community home (content lands in the next phase).
  const sub = membership.subscription;
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-10">
      <section className="mx-auto w-full max-w-5xl">
        {welcome && (
          <div className="mb-6 rounded-2xl border border-forest-200 bg-forest-50 px-5 py-4 text-sm text-forest-800">
            🎉 Welcome to Bold Ideas Growth Club, {user?.displayName || 'member'}! Your membership is active.
          </div>
        )}

        <div className="rounded-[2rem] border border-ink-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-gold-600">Bold Ideas Growth Club</p>
              <h1 className="font-display text-4xl font-bold tracking-tight text-ink-900">Your Growth Club dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">Continue learning, ask better questions, and keep your progress visible.</p>
            </div>
            <span className="rounded-full bg-forest-100 px-3 py-1 text-xs font-semibold text-forest-800">
              {sub?.status === 'PAST_DUE' ? 'Payment retrying' : 'Active member'}
            </span>
          </div>
        </div>

        {stats && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 bg-white px-5 py-3 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-400 text-sm font-bold text-forest-900">{stats.level}</span>
            <div>
              <p className="text-sm font-semibold text-ink-900">Level {stats.level}</p>
              <p className="text-xs text-ink-500">{stats.points} points{stats.rank ? ` · rank #${stats.rank}` : ''}</p>
            </div>
            {stats.pointsToNextLevel != null && (
              <p className="ml-auto text-xs text-ink-500">{stats.pointsToNextLevel} pts to level {stats.level + 1}</p>
            )}
          </div>
        )}

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
            {isAdmin ? 'No courses yet — use Manage to add your first Growth Club course.' : 'No Growth Club courses published yet. Check back soon.'}
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {courses.map((c) => {
              const pct = c.lessonCount ? Math.round((c.completedCount / c.lessonCount) * 100) : 0;
              return (
                <Link key={c.id} href={`/community/course/${c.slug}` as Route} className="group rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition hover:border-forest-200">
                  {c.coverImage && <img src={c.coverImage} alt="" className="mb-3 h-32 w-full rounded-xl object-cover" />}
                  <h3 className="font-display text-lg font-semibold text-ink-900 group-hover:text-forest-800">{c.title}</h3>
                  {c.description && (
                    <div className="mt-1 line-clamp-3 text-sm text-ink-500">
                      <Markdown>{c.description}</Markdown>
                    </div>
                  )}
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
          <p className="mt-1 text-sm text-ink-500">Ask questions, share wins, and get answers from CreatorPlus and other members →</p>
        </Link>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-ink-900">Leaderboard</h2>
            <ol className="mt-3 space-y-1">
              {leaderboard.slice(0, 10).map((m) => (
                <li key={m.userId} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm ${m.userId === user?.id ? 'bg-forest-50' : ''}`}>
                  <span className="w-6 text-center text-xs font-bold text-ink-400">{m.rank}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-100 text-[11px] font-bold text-forest-800">{(m.displayName || '?').slice(0, 1).toUpperCase()}</span>
                  <span className="flex-1 truncate text-ink-800">{m.displayName || 'Member'}</span>
                  <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-semibold text-gold-800">Lv {m.level}</span>
                  <span className="w-10 text-right text-xs font-semibold text-ink-600">{m.points}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Membership management */}
        <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-ink-900">Your Growth Club membership</h2>
          {sub && (
            <p className="mt-1 text-sm text-ink-600">
              {sub.amount != null && `${sub.currency} ${Number(sub.amount).toLocaleString()} / ${sub.interval === 'MONTHLY' ? 'month' : 'year'}`}
              {sub.currentPeriodEnd && ` · ${sub.cancelAtPeriodEnd ? 'ends' : 'renews'} ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`}
            </p>
          )}
          {note && <p className="mt-3 rounded-lg bg-cream-100 px-3 py-2 text-xs text-ink-600">{note}</p>}
          {sub && !sub.cancelAtPeriodEnd && (
            <button onClick={cancel} disabled={canceling} className="mt-4 rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-cream-100 disabled:opacity-50">
              {canceling ? 'Cancelling…' : 'Cancel Growth Club membership'}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
