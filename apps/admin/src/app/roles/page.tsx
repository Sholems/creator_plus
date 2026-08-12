'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: { id: string; name: string; resource: string; action: string }[];
  memberCount: number;
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

export default function AdminRolesPage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Create role
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPerms, setNewPerms] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Assign roles to a user
  const [search, setSearch] = useState('');
  const [userOptions, setUserOptions] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    Promise.all([api.getRoles(token), api.getPermissions(token)])
      .then(([r, p]) => {
        setRoles(r.data || []);
        setPermissions(p.data || []);
      })
      .catch((e) => toast(e.message || 'Failed to load roles', 'error'))
      .finally(() => setLoading(false));
  }, [token, toast]);

  useEffect(() => {
    load();
  }, [load]);

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

  const togglePerm = (name: string) =>
    setNewPerms((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));

  const createRole = async () => {
    if (!token || !newName.trim()) return;
    setCreating(true);
    try {
      await api.createRole(token, {
        name: newName.trim().toLowerCase().replace(/\s+/g, '_'),
        description: newDesc.trim() || undefined,
        permissions: newPerms,
      });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setNewPerms([]);
      load();
      toast('Role created');
    } catch (e: any) {
      toast(e.message || 'Failed to create role', 'error');
    } finally {
      setCreating(false);
    }
  };

  const pickUser = (u: any) => {
    setSelectedUser(u);
    setSelectedRoles(u.roles || []);
    setSearch('');
    setUserOptions([]);
  };

  const assignRoles = async () => {
    if (!token || !selectedUser) return;
    setAssigning(true);
    try {
      await api.setUserRoles(token, selectedUser.id, selectedRoles);
      toast(`Updated roles for ${selectedUser.displayName || selectedUser.email}`);
      setSelectedUser(null);
      setSelectedRoles([]);
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to assign roles', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const permissionGroups = permissions.reduce<Record<string, string[]>>((acc, p) => {
    acc[p.resource] = acc[p.resource] || [];
    acc[p.resource].push(p.name);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-gold-600">Access Control</p>
          <h1 className="page-title mt-1">Roles &amp; Permissions</h1>
        </div>
        <button className="btn btn-primary btn-md" onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? 'Cancel' : 'New role'}
        </button>
      </div>

      {showCreate && (
        <section className="surface-card mb-6 p-6">
          <h2 className="eyebrow text-forest-700">Create role</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-ink-700">Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. content_manager"
                className="input mt-1.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700">Description</label>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Optional"
                className="input mt-1.5"
              />
            </div>
          </div>

          <p className="mt-4 text-sm font-medium text-ink-700">Permissions</p>
          {Object.keys(permissionGroups).length === 0 ? (
            <p className="mt-2 rounded-lg bg-cream-100/60 px-3 py-2 text-xs text-ink-500">
              No permissions are defined yet. Roles can still be created — add permissions to the database to attach them.
            </p>
          ) : (
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
              {Object.entries(permissionGroups).map(([resource, names]) => (
                <div key={resource} className="rounded-xl border border-ink-100 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{resource}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {names.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => togglePerm(name)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          newPerms.includes(name)
                            ? 'bg-forest-800 text-white'
                            : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              className="btn btn-primary btn-md"
              onClick={createRole}
              disabled={creating || !newName.trim()}
            >
              {creating ? 'Creating…' : 'Create role'}
            </button>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="surface-card overflow-hidden lg:col-span-2">
          <div className="px-6 pt-5 pb-3">
            <h2 className="eyebrow text-forest-700">Roles</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-head-row">
                  <th className="th">Role</th>
                  <th className="th">Members</th>
                  <th className="th">Permissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {loading ? (
                  <tr><td colSpan={3} className="td py-10 text-center text-ink-500">Loading…</td></tr>
                ) : roles.length === 0 ? (
                  <tr><td colSpan={3} className="td py-10 text-center text-ink-500">No roles found</td></tr>
                ) : (
                  roles.map((r) => (
                    <tr key={r.id} className="table-row-hover align-top">
                      <td className="td">
                        <span className="font-semibold text-ink-900">{r.name}</span>
                        {r.description && (
                          <span className="block text-xs text-ink-500">{r.description}</span>
                        )}
                      </td>
                      <td className="td">
                        <span className="badge badge-blue">{r.memberCount}</span>
                      </td>
                      <td className="td">
                        <div className="flex max-w-md flex-wrap gap-1.5">
                          {r.permissions.length === 0 ? (
                            <span className="text-xs text-ink-400">No permissions</span>
                          ) : (
                            r.permissions.slice(0, 6).map((p) => (
                              <span key={p.id} className="badge badge-green">{p.name}</span>
                            ))
                          )}
                          {r.permissions.length > 6 && (
                            <span className="badge badge-gray">+{r.permissions.length - 6} more</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="eyebrow text-forest-700">Assign roles to a user</h2>
          {!selectedUser ? (
            <div className="mt-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users…"
                className="input"
              />
              <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                {search.trim() && userOptions.length === 0 && (
                  <p className="px-2 py-3 text-center text-sm text-ink-400">No matches</p>
                )}
                {userOptions.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => pickUser(u)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-cream-100"
                  >
                    <span className="text-sm text-ink-800">{u.displayName || u.email}</span>
                    <span className="text-xs text-ink-400">{u.email}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <div className="flex items-center justify-between rounded-xl bg-cream-100/60 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{selectedUser.displayName || selectedUser.email}</p>
                  <p className="truncate text-xs text-ink-500">{selectedUser.email}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="btn btn-ghost btn-sm">Change</button>
              </div>

              <div className="mt-4 space-y-1.5">
                {roles.map((r) => (
                  <label
                    key={r.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                      selectedRoles.includes(r.name) ? 'border-gold-400 bg-gold-50' : 'border-ink-100 hover:bg-cream-100'
                    }`}
                  >
                    <span className="text-sm font-medium text-ink-800">{r.name}</span>
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(r.name)}
                      onChange={() =>
                        setSelectedRoles((prev) =>
                          prev.includes(r.name) ? prev.filter((n) => n !== r.name) : [...prev, r.name],
                        )
                      }
                      className="accent-gold-500"
                    />
                  </label>
                ))}
              </div>

              <button
                className="btn btn-primary btn-md mt-4 w-full"
                onClick={assignRoles}
                disabled={assigning}
              >
                {assigning ? 'Saving…' : 'Save roles'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
