'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

const INCLUDED = [
  [
    'Learn',
    'Start with free CreatorPlus courses, video lessons, text guides, and downloadable resources.',
  ],
  [
    'Ask',
    'Post questions, find unanswered discussions, and get practical help from the community.',
  ],
  ['Connect', 'Share wins and useful ideas in focused channels without marketplace noise.'],
  ['Progress', 'Track completed lessons, earn points, and move up the CreatorPlus Community leaderboard.'],
];

export default function CommunityJoinPage() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="min-h-screen overflow-hidden bg-cream-50 px-4 py-10 sm:py-16">
      <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2.25rem] border border-forest-900/10 bg-forest-950 px-6 py-10 text-cream-50 shadow-2xl shadow-forest-950/15 sm:px-10 sm:py-14 lg:px-14">
        <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-forest-500/30 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <Link
              href="/community"
              className="text-sm font-semibold text-gold-300 hover:text-gold-200"
            >
              ← CreatorPlus Community
            </Link>
            <p className="mt-10 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold-300">
              Free community membership
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-5xl font-bold leading-[0.96] tracking-tight sm:text-6xl">
              Bring your bold idea. We’ll help you move it forward.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-cream-100/80 sm:text-lg">
              Registration is free. Your CreatorPlus account gives you immediate access to the
              CreatorPlus Community discussion room, free courses, learning progress, resources, and member
              leaderboard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {isAuthenticated ? (
                <Link
                  href="/community"
                  className="inline-flex items-center justify-center rounded-full bg-gold-400 px-7 py-3.5 text-sm font-bold text-forest-950 hover:bg-gold-300"
                >
                  Enter the CreatorPlus Community
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/register?next=/community"
                    className="inline-flex items-center justify-center rounded-full bg-gold-400 px-7 py-3.5 text-sm font-bold text-forest-950 hover:bg-gold-300"
                  >
                    Create free account
                  </Link>
                  <Link
                    href="/auth/login?redirect=/community"
                    className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold text-cream-50 hover:bg-white/15"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
            <p className="mt-4 text-xs text-cream-100/60">
              No card required. Premium courses may be offered separately later.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.08] p-5 backdrop-blur sm:p-6">
            <p className="eyebrow text-gold-300">Included when you join</p>
            <div className="mt-5 space-y-3">
              {INCLUDED.map(([title, text], index) => (
                <div
                  key={title}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-400 font-mono text-xs font-bold text-forest-950">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-cream-100/70">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 grid w-full max-w-6xl gap-4 md:grid-cols-3">
        {[
          [
            'Free to join',
            'Every registered CreatorPlus user can participate in the community immediately.',
          ],
          [
            'Curated by CreatorPlus',
            'Courses and official guidance come from the platform team, keeping the club focused.',
          ],
          [
            'Premium-ready',
            'Advanced courses can be sold separately later without putting the community behind a paywall.',
          ],
        ].map(([title, text]) => (
          <div key={title} className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-ink-900">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-ink-600">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
