'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

type Audience = 'all' | 'role' | 'users';

export default function AdminBroadcastsPage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [audience, setAudience] = useState<Audience>('all');
  const [roles, setRoles] = useState<{ id: string; name: string; memberCount: number }[]>([]);
  const [role, setRole] = useState('');
  const [userOptions, setUserOptions] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [preview, setPreview] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getRoles(token).then((r) => setRoles(r.data || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || !search.trim()) {
      setUserOptions([]);
      return;
    }
    const t = window.setTimeout(() => {
      api
        .getUsers(token, { search: search.trim(), perPage: 10 })
        .then((r) => setUserOptions(r.data || []))
        .catch(() => setUserOptions([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [token, search]);

  const buildBody = () => ({
    title,
    message,
    audience,
    role: audience === 'role' ? role || undefined : undefined,
    userIds: audience === 'users' ? selectedUsers : undefined,
    sendEmail,
  });

  const handlePreview = async () => {
    if (!token) return;
    setPreviewing(true);
    try {
      const r = await api.broadcastPreview(token, buildBody());
      setPreview(r.count);
    } catch (e: any) {
      toast(e.message || 'Preview failed', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    if (!token) return;
    setSending(true);
    try {
      const r = await api.sendBroadcast(token, buildBody());
      toast(`Broadcast sent to ${r.count} user${r.count === 1 ? '' : 's'}`);
      setTitle('');
      setMessage('');
      setPreview(null);
    } catch (e: any) {
      toast(e.message || 'Broadcast failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const toggleUser = (id: string) =>
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));

  const roleOptions = roles.filter((r) => r.memberCount > 0);

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow text-gold-600">Communications</p>
        <h1 className="page-title mt-1">Admin Broadcasts</h1>
        <p className="mt-1 text-sm text-ink-500">
          Send an in-app notification (and optionally an email) to a group of users.
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        <section className="surface-card p-6">
          <h2 className="eyebrow text-forest-700">Audience</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                { value: 'all', label: 'All users' },
                { value: 'role', label: 'By role' },
                { value: 'users', label: 'Specific users' },
              ] as { value: Audience; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAudience(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  audience === opt.value
                    ? 'bg-forest-800 text-white'
                    : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {audience === 'role' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-ink-700">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="input mt-1.5">
                <option value="">Select a role…</option>
                {roleOptions.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name} ({r.memberCount})
                  </option>
                ))}
              </select>
            </div>
          )}

          {audience === 'users' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-ink-700">Search &amp; select users</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search by name or email…"
                className="input mt-1.5"
              />
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-ink-100 p-2">
                {search.trim() && userOptions.length === 0 && (
                  <p className="px-2 py-3 text-center text-sm text-ink-400">No matches</p>
                )}
                {userOptions.map((u) => (
                  <label
                    key={u.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                      selectedUsers.includes(u.id) ? 'bg-gold-50' : 'hover:bg-cream-100'
                    }`}
                  >
                    <span className="text-sm text-ink-800">
                      {u.displayName || u.email}
                      <span className="ml-1.5 text-xs text-ink-400">{u.email}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u.id)}
                      onChange={() => toggleUser(u.id)}
                      className="accent-gold-500"
                    />
                  </label>
                ))}
              </div>
              {selectedUsers.length > 0 && (
                <p className="mt-1 text-xs text-ink-500">{selectedUsers.length} selected</p>
              )}
            </div>
          )}
        </section>

        <section className="surface-card p-6">
          <h2 className="eyebrow text-forest-700">Message</h2>
          <div className="mt-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                placeholder="e.g. Scheduled maintenance tonight"
                className="input mt-1.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="Write the notification body…"
                className="input mt-1.5 min-h-28"
              />
            </div>
            <label className="flex cursor-pointer items-center justify-between">
              <span>
                <span className="block text-sm font-medium text-ink-700">Also send as email</span>
                <span className="block text-xs text-ink-500">Fire-and-forget email to every recipient</span>
              </span>
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4 accent-gold-500"
              />
            </label>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn btn-ghost btn-md"
            onClick={handlePreview}
            disabled={previewing || !token || !title.trim() || !message.trim()}
          >
            {previewing ? 'Previewing…' : 'Preview recipients'}
          </button>
          {preview !== null && (
            <span className="badge badge-gold">{preview} recipient{preview === 1 ? '' : 's'} would be notified</span>
          )}
          <button
            className="btn btn-primary btn-md"
            onClick={handleSend}
            disabled={sending || !token || !title.trim() || !message.trim()}
          >
            {sending ? 'Sending…' : 'Send broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
}
