'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { CommunityAdminNav } from '@/components/community/admin/admin-nav';

const input = 'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm';
export default function ManageCommunityChallengesPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.roles?.some((role) => role === 'admin' || role === 'super_admin');
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '',
    startsAt: '',
    endsAt: '',
    accessLevel: 'FREE',
    published: false,
  });
  const [milestones, setMilestones] = useState<Record<string, string>>({});
  async function refresh() {
    if (token) setItems(await api.adminGetCommunityChallenges(token));
  }
  useEffect(() => {
    refresh();
  }, [token]);
  if (!isAdmin) return <main className="p-8 text-ink-600">Administrator access required.</main>;
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">
          Growth Club operations
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-900">Challenges</h1>
        <CommunityAdminNav />
        <section className="mt-6 rounded-2xl border border-ink-100 bg-white p-5">
          <h2 className="font-display text-xl font-bold">Create a challenge</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              className={input}
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              className={input}
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
            <input
              className={input}
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            />
            <select
              className={input}
              value={form.accessLevel}
              onChange={(e) => setForm({ ...form, accessLevel: e.target.value })}
            >
              <option value="FREE">All members</option>
              <option value="PREMIUM">Premium</option>
            </select>
            <button
              onClick={async () => {
                if (!token || !form.title || !form.startsAt || !form.endsAt) return;
                await api.adminCreateCommunityChallenge(token, {
                  ...form,
                  startsAt: new Date(form.startsAt).toISOString(),
                  endsAt: new Date(form.endsAt).toISOString(),
                });
                setForm({ ...form, title: '' });
                await refresh();
              }}
              className="rounded-full bg-forest-800 px-5 py-2 text-sm font-semibold text-cream-50"
            >
              Create
            </button>
          </div>
        </section>
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-ink-100 bg-white p-5">
              <div className="flex justify-between">
                <div>
                  <strong>{item.title}</strong>
                  <p className="text-xs text-ink-500">
                    {item._count?.enrollments || 0} members · {item._count?.milestones || 0}{' '}
                    milestones
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await api.adminUpdateCommunityChallenge(token!, item.id, {
                      published: !item.published,
                    });
                    await refresh();
                  }}
                  className="text-xs font-semibold text-forest-700"
                >
                  {item.published ? 'Unpublish' : 'Publish'}
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  className={input}
                  placeholder="New milestone"
                  value={milestones[item.id] || ''}
                  onChange={(e) => setMilestones({ ...milestones, [item.id]: e.target.value })}
                />
                <button
                  onClick={async () => {
                    const title = milestones[item.id]?.trim();
                    if (!title) return;
                    await api.adminAddChallengeMilestone(token!, item.id, { title });
                    setMilestones({ ...milestones, [item.id]: '' });
                    await refresh();
                  }}
                  className="rounded-full border border-ink-200 px-4 text-xs font-semibold"
                >
                  Add
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
