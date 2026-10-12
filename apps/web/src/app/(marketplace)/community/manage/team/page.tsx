'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { isPlatformAdmin } from '@/lib/roles';
import { CommunityAdminNav } from '@/components/community/admin/admin-nav';
import { MemberAvatar } from '@/components/community/member-avatar';

export default function CommunityTeamPage() {
  const { token, user } = useAuth();
  const isAdmin = isPlatformAdmin(user?.roles);
  const [team, setTeam] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function refresh() {
    if (!token) return;
    setTeam(await api.getCommunityTeam(token));
  }

  useEffect(() => {
    if (isAdmin) refresh().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  if (!isAdmin) return <main className="p-8 text-ink-600">Administrator access required.</main>;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const added = await api.addCommunityManager(token!, email.trim());
      setMessage({ ok: true, text: `${added.displayName || added.email} is now a community manager.` });
      setEmail('');
      await refresh();
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Could not add that member.' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: any) {
    if (!confirm(`Remove ${member.displayName || member.email} as a community manager?`)) return;
    await api.removeCommunityManager(token!, member.id);
    await refresh();
  }

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">CreatorPlus Community operations</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-900">Community team</h1>
        <CommunityAdminNav />

        <section className="mt-6 rounded-2xl border border-ink-100 bg-white p-5">
          <h2 className="font-display text-xl font-bold text-ink-900">Add a community manager</h2>
          <p className="mt-1 text-sm text-ink-500">
            Managers can create and edit courses (including uploading lessons), run events and challenges, and
            moderate the community. They can&apos;t add other managers or reach the platform admin console.
          </p>
          <form onSubmit={add} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
              className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm"
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-forest-800 px-5 py-2 text-sm font-semibold text-cream-50 disabled:opacity-60"
            >
              {busy ? 'Adding…' : 'Add manager'}
            </button>
          </form>
          {message && (
            <p className={`mt-2 text-sm font-medium ${message.ok ? 'text-forest-700' : 'text-clay-600'}`}>{message.text}</p>
          )}
          <p className="mt-2 text-xs text-ink-400">The person must already have a CreatorPlus account.</p>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-ink-100 bg-white">
          {team.length === 0 ? (
            <p className="p-5 text-sm text-ink-500">No community managers yet.</p>
          ) : (
            team.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 border-b border-ink-100 p-4 last:border-0">
                <div className="flex min-w-0 items-center gap-3">
                  <MemberAvatar name={m.displayName || m.email} src={m.avatar} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">{m.displayName || m.email}</p>
                    <p className="truncate text-xs text-ink-500">
                      {m.email} · since {new Date(m.grantedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => remove(m)}
                  className="shrink-0 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-clay-600 hover:bg-clay-50"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
