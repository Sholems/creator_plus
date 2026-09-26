'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function CommunityChallengesPage() {
  const { token } = useAuth();
  const [challenges, setChallenges] = useState<any[]>([]);
  useEffect(() => {
    if (token) api.getCommunityChallenges(token).then(setChallenges);
  }, [token]);
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-600">
          Accountability
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink-950">
          Turn an idea into visible progress.
        </h1>
        <p className="mt-3 max-w-2xl text-ink-600">
          Join a focused sprint, check in against milestones, and move with a small accountability
          group.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {challenges.map((challenge) => (
            <Link
              key={challenge.id}
              href={
                challenge.locked
                  ? ('/community/join' as Route)
                  : (`/community/challenge/${challenge.slug}` as Route)
              }
              className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm hover:border-forest-200"
            >
              <div className="flex justify-between text-xs font-semibold text-ink-500">
                <span>
                  {challenge.accessLevel === 'PREMIUM' ? 'Premium challenge' : 'Open challenge'}
                </span>
                <span>{challenge.memberCount} joined</span>
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold text-ink-900">
                {challenge.title}
              </h2>
              <p className="mt-2 text-sm text-ink-600">
                {new Date(challenge.startsAt).toLocaleDateString()} —{' '}
                {new Date(challenge.endsAt).toLocaleDateString()}
              </p>
              <div className="mt-5 flex items-center justify-between text-xs text-ink-500">
                <span>{challenge.milestoneCount} milestones</span>
                <span>
                  {challenge.enrollmentStatus === 'ACTIVE'
                    ? 'In progress →'
                    : challenge.enrollmentStatus === 'COMPLETED'
                      ? 'Completed ✓'
                      : challenge.locked
                        ? 'Unlock →'
                        : 'View challenge →'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
