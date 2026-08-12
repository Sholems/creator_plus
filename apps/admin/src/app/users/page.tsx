'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, WEB_URL, PaginationMeta } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { SearchBox } from '@/components/search-box';
import { Pagination } from '@/components/pagination';
import { useToast } from '@/lib/toast';

const PER_PAGE = 20;

export default function AdminUsersPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    (p = page, s = search) => {
      if (!token) return;
      setLoading(true);
      api
        .getUsers(token, { page: p, perPage: PER_PAGE, search: s || undefined })
        .then((res) => {
          setUsers(res.data || []);
          setPagination(res.pagination || null);
        })
        .catch((e) => toast(e.message || 'Failed to load users', 'error'))
        .finally(() => setLoading(false));
    },
    [token, toast, page, search],
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleVerify = async (creatorId: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await api.verifyCreator(token, creatorId);
      toast('Creator verified');
      load();
    } catch (e: any) {
      toast(e?.message || 'Failed to verify creator', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (creatorId: string) => {
    const reason = window.prompt('Reason for rejection (optional):') ?? undefined;
    if (reason === undefined) return;
    if (!token) return;
    setBusy(true);
    try {
      await api.rejectCreator(token, creatorId, reason);
      toast('Creator verification rejected');
      load();
    } catch (e: any) {
      toast(e?.message || 'Failed to reject creator', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-gold-600">Community</p>
          <h1 className="page-title mt-1">Users</h1>
        </div>
        <span className="badge badge-gray">
          {pagination?.total ?? users.length} user{pagination?.total === 1 ? '' : 's'}
        </span>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="surface-card-header flex flex-wrap items-center justify-between gap-3">
          <SearchBox
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search name or email…"
          />
          {busy && <span className="text-xs text-ink-500">Working…</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-head-row">
                <th className="th">User</th>
                <th className="th">Role</th>
                <th className="th">Status</th>
                <th className="th">Joined</th>
                <th className="th">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="td py-8 text-center text-ink-500">Loading…</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="td py-8 text-center text-ink-500">No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="table-row-hover">
                    <td className="td">
                      <div className="flex items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-100">
                          <span className="text-sm font-medium text-forest-700">
                            {(user.displayName || user.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-ink-900">{user.displayName || '—'}</div>
                          <div className="text-sm text-ink-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      <span
                        className={`badge ${
                          user.role === 'super_admin' || user.role === 'admin'
                            ? 'badge-purple'
                            : user.role === 'creator'
                              ? 'badge-blue'
                              : 'badge-gray'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="td">
                      <span
                        className={`badge ${
                          user.status === 'ACTIVE' ? 'badge-green' : 'badge-red'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="td text-ink-500">
                      {formatDate(user.createdAt, { short: true })}
                    </td>
                    <td className="td">
                      {user.creator ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`badge ${
                              user.creator.verificationStatus === 'APPROVED'
                                ? 'badge-green'
                                : user.creator.verificationStatus === 'REJECTED'
                                  ? 'badge-red'
                                  : 'badge-gold'
                            }`}
                          >
                            {user.creator.verificationStatus}
                          </span>
                          {user.creator.verificationStatus !== 'APPROVED' && (
                            <button
                              onClick={() => handleVerify(user.creator.id)}
                              className="btn btn-primary btn-sm"
                            >
                              Verify
                            </button>
                          )}
                          {user.creator.verificationStatus !== 'REJECTED' && (
                            <button
                              onClick={() => handleReject(user.creator.id)}
                              className="btn btn-ghost btn-sm !text-clay-600"
                            >
                              Reject
                            </button>
                          )}
                          {user.creator.slug && (
                            <a
                              href={`${WEB_URL}/creator/${user.creator.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-gold-600 hover:text-gold-700"
                            >
                              View site ↗
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-ink-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={pagination?.totalPages ?? 1}
          total={pagination?.total ?? 0}
          perPage={PER_PAGE}
          onPageChange={(p) => {
            setPage(p);
          }}
        />
      </div>
    </div>
  );
}
