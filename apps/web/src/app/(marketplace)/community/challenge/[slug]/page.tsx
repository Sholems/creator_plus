'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { CommunityRichContent } from '@/components/community/rich-content';

export default function CommunityChallengePage() {
  const { slug } = useParams<{ slug: string }>();
  const { token } = useAuth();
  const [challenge, setChallenge] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    if (token && slug) setChallenge(await api.getCommunityChallenge(token, slug));
  }
  useEffect(() => {
    load();
  }, [token, slug]);

  async function join() {
    if (!token || !challenge) return;
    setBusy(true);
    try {
      await api.joinCommunityChallenge(token, challenge.id);
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function checkIn() {
    if (!token || !challenge) return;
    setBusy(true);
    try {
      await api.checkInCommunityChallenge(token, challenge.id, {
        milestoneId: milestoneId || undefined,
        note: note || undefined,
        progress,
      });
      setNote('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!challenge) return <main className="p-8 text-ink-500">Loading challenge…</main>;
  const latest = challenge.enrollment?.checkIns?.[0];
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[2rem] bg-forest-950 p-7 text-cream-50 md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">
            CreatorPlus Community challenge
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold">{challenge.title}</h1>
          <p className="mt-3 text-cream-200">
            {challenge.memberCount} members · {new Date(challenge.startsAt).toLocaleDateString()} to{' '}
            {new Date(challenge.endsAt).toLocaleDateString()}
          </p>
        </section>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="rounded-3xl border border-ink-100 bg-white p-6">
            {challenge.description && (
              <CommunityRichContent
                body={challenge.description}
                format={challenge.descriptionFormat}
              />
            )}
            <h2 className="mt-8 font-display text-2xl font-bold text-ink-900">Milestones</h2>
            <ol className="mt-4 space-y-3">
              {challenge.milestones.map((item: any, index: number) => (
                <li key={item.id} className="rounded-2xl bg-cream-100 p-4">
                  <span className="text-xs font-bold text-clay-600">STEP {index + 1}</span>
                  <strong className="mt-1 block text-ink-900">{item.title}</strong>
                  {item.description && (
                    <p className="mt-1 text-sm text-ink-600">{item.description}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>
          <aside className="rounded-3xl border border-ink-100 bg-white p-6">
            {!challenge.enrollment ? (
              <>
                <h2 className="font-display text-2xl font-bold text-ink-900">Ready to commit?</h2>
                <p className="mt-2 text-sm text-ink-600">
                  You’ll be placed in a small accountability group automatically.
                </p>
                <button
                  onClick={join}
                  disabled={busy}
                  className="mt-5 w-full rounded-full bg-clay-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  Join challenge
                </button>
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-500">
                  {challenge.enrollment.group?.name || 'Your accountability group'}
                </p>
                <h2 className="mt-3 font-display text-2xl font-bold text-ink-900">
                  Weekly check-in
                </h2>
                {latest && (
                  <p className="mt-2 text-sm text-ink-500">Latest progress: {latest.progress}%</p>
                )}
                <select
                  value={milestoneId}
                  onChange={(e) => setMilestoneId(e.target.value)}
                  className="mt-4 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                >
                  <option value="">Overall progress</option>
                  {challenge.milestones.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
                <label className="mt-4 block text-xs font-semibold text-ink-600">
                  Progress: {progress}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="mt-2 w-full"
                />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  placeholder="What moved forward? Where are you stuck?"
                  className="mt-4 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                />
                <button
                  onClick={checkIn}
                  disabled={busy}
                  className="mt-3 w-full rounded-full bg-forest-800 px-5 py-3 text-sm font-semibold text-cream-50"
                >
                  Save check-in
                </button>
              </>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
