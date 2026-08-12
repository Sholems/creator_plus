'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, PaginationMeta } from '@/lib/api';
import { Pagination } from '@/components/pagination';
import { useToast } from '@/lib/toast';

type Tab = 'applications' | 'products';

const AFFILIATE_STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'badge-green',
  PENDING: 'badge-gold',
  SUSPENDED: 'badge-red',
  REJECTED: 'badge-red',
};

const PRODUCT_STATUS_STYLES: Record<string, string> = {
  APPROVED: 'badge-green',
  PENDING_REVIEW: 'badge-gold',
  SUSPENDED: 'badge-red',
  DISABLED: 'badge-gray',
};

const PER_PAGE = 20;

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminAffiliatesPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('products');
  const [applications, setApplications] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [appStatus, setAppStatus] = useState('');
  const [prodStatus, setProdStatus] = useState('');
  const [appPagination, setAppPagination] = useState<PaginationMeta | null>(null);
  const [prodPagination, setProdPagination] = useState<PaginationMeta | null>(null);
  const [appPage, setAppPage] = useState(1);
  const [prodPage, setProdPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const fetchList =
      tab === 'applications'
        ? api.getAffiliateApplications(token, appStatus || undefined, appPage, PER_PAGE)
        : api.getAffiliateProducts(token, prodStatus || undefined, prodPage, PER_PAGE);
    fetchList
      .then((res) => {
        if (tab === 'applications') {
          setApplications(res.data || []);
          setAppPagination(res.pagination || null);
        } else {
          setProducts(res.data || []);
          setProdPagination(res.pagination || null);
        }
      })
      .catch((e) => toast(e.message || 'Failed to load affiliates', 'error'))
      .finally(() => setLoading(false));
  }, [token, tab, appStatus, prodStatus, appPage, prodPage, toast]);

  const run = async (id: string, action: () => Promise<any>, reload: () => void, successMsg?: string) => {
    if (!token) return;
    setBusyId(id);
    try {
      await action();
      toast(successMsg || 'Done');
      reload();
    } catch (e: any) {
      toast(e.message || 'Action failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const reloadApplications = useCallback(() => {
    if (!token) return;
    api
      .getAffiliateApplications(token, appStatus || undefined, appPage, PER_PAGE)
      .then((res) => {
        setApplications(res.data || []);
        setAppPagination(res.pagination || null);
      })
      .catch(() => {});
  }, [token, appStatus, appPage]);

  const reloadProducts = useCallback(() => {
    if (!token) return;
    api
      .getAffiliateProducts(token, prodStatus || undefined, prodPage, PER_PAGE)
      .then((res) => {
        setProducts(res.data || []);
        setProdPagination(res.pagination || null);
      })
      .catch(() => {});
  }, [token, prodStatus, prodPage]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow text-gold-600">Referral program</p>
          <h1 className="page-title mt-1">Affiliates</h1>
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b border-ink-100">
        {(
          [
            { id: 'products', label: 'Product approvals' },
            { id: 'applications', label: 'Affiliate applications' },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setAppPage(1);
              setProdPage(1);
            }}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-gold-500 text-gold-600'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' ? (
        <div className="surface-card overflow-hidden">
          <div className="surface-card-header">
            <select
              value={prodStatus}
              onChange={(e) => {
                setProdStatus(e.target.value);
                setProdPage(1);
              }}
              className="input w-auto"
            >
              <option value="">All products</option>
              <option value="PENDING_REVIEW">Pending review</option>
              <option value="APPROVED">Approved</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DISABLED">Not in program</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-head-row">
                  <th className="th">Product</th>
                  <th className="th">Creator</th>
                  <th className="th">Category</th>
                  <th className="th">Commission</th>
                  <th className="th">Status</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="td py-10 text-center text-ink-500">
                      Loading…
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="td py-10 text-center text-ink-500">
                      No products
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="table-row-hover">
                      <td className="td font-medium text-ink-900">{p.title}</td>
                      <td className="td text-ink-600">{p.creator?.storeName || '—'}</td>
                      <td className="td text-ink-600">{p.category?.name || '—'}</td>
                      <td className="td price-tag text-ink-900">
                        {p.affiliateCommissionRate ? `${p.affiliateCommissionRate}%` : 'Default'}
                      </td>
                      <td className="td">
                        <span
                          className={`badge ${PRODUCT_STATUS_STYLES[p.affiliateStatus] || 'badge-gray'}`}
                        >
                          {p.affiliateStatus}
                        </span>
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          {p.affiliateStatus === 'PENDING_REVIEW' && (
                            <>
                              <button
                                onClick={() =>
                                  run(
                                    p.id,
                                    () => api.approveAffiliateProduct(token!, p.id),
                                    reloadProducts,
                                    'Affiliate product approved',
                                  )
                                }
                                disabled={busyId === p.id}
                                className="btn btn-primary btn-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const reason = window.prompt(
                                    'Reason for rejection (required, sent to creator):',
                                  );
                                  if (!reason) return;
                                  run(
                                    p.id,
                                    () => api.rejectAffiliateProduct(token!, p.id, reason),
                                    reloadProducts,
                                    'Affiliate product rejected',
                                  );
                                }}
                                disabled={busyId === p.id}
                                className="btn btn-danger btn-sm"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={prodPage}
            totalPages={prodPagination?.totalPages ?? 1}
            total={prodPagination?.total ?? 0}
            perPage={PER_PAGE}
            onPageChange={setProdPage}
          />
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="surface-card-header">
            <select
              value={appStatus}
              onChange={(e) => {
                setAppStatus(e.target.value);
                setAppPage(1);
              }}
              className="input w-auto"
            >
              <option value="">All applications</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-head-row">
                  <th className="th">Affiliate</th>
                  <th className="th">Joined</th>
                  <th className="th">Links</th>
                  <th className="th">Conversions</th>
                  <th className="th">Status</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="td py-10 text-center text-ink-500">
                      Loading…
                    </td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="td py-10 text-center text-ink-500">
                      No applications
                    </td>
                  </tr>
                ) : (
                  applications.map((a) => (
                    <tr key={a.id} className="table-row-hover">
                      <td className="td">
                        <p className="font-medium text-ink-900">{a.user?.displayName || '—'}</p>
                        <p className="text-sm text-ink-500">{a.user?.email}</p>
                      </td>
                      <td className="td text-ink-600">{formatDate(a.createdAt)}</td>
                      <td className="td text-ink-600">{a._count?.links ?? 0}</td>
                      <td className="td text-ink-600">{a._count?.conversions ?? 0}</td>
                      <td className="td">
                        <span
                          className={`badge ${AFFILIATE_STATUS_STYLES[a.status] || 'badge-gray'}`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          {(a.status === 'PENDING' || a.status === 'REJECTED') && (
                            <button
                                onClick={() =>
                                  run(
                                    a.id,
                                    () => api.approveAffiliateApplication(token!, a.id),
                                    reloadApplications,
                                    'Affiliate application approved',
                                  )
                                }
                              disabled={busyId === a.id}
                              className="btn btn-primary btn-sm"
                            >
                              Approve
                            </button>
                          )}
                          {a.status === 'PENDING' && (
                            <button
                              onClick={() => {
                                const reason =
                                  window.prompt('Reason for rejection (sent to applicant):') ||
                                  undefined;
                                run(
                                  a.id,
                                  () => api.rejectAffiliateApplication(token!, a.id, reason),
                                  reloadApplications,
                                  'Affiliate application rejected',
                                );
                              }}
                              disabled={busyId === a.id}
                              className="btn btn-danger btn-sm"
                            >
                              Reject
                            </button>
                          )}
                          {a.status === 'ACTIVE' && (
                            <button
                              onClick={() => {
                                const reason = window.prompt(
                                  'Reason for suspension (required, sent to affiliate):',
                                );
                                if (!reason) return;
                                run(
                                  a.id,
                                  () => api.suspendAffiliate(token!, a.id, reason),
                                  reloadApplications,
                                  'Affiliate suspended',
                                );
                              }}
                              disabled={busyId === a.id}
                              className="btn btn-danger btn-sm"
                            >
                              Suspend
                            </button>
                          )}
                          {a.status === 'SUSPENDED' && (
                            <button
                                onClick={() =>
                                  run(
                                    a.id,
                                    () => api.unsuspendAffiliate(token!, a.id),
                                    reloadApplications,
                                    'Affiliate unsuspended',
                                  )
                                }
                              disabled={busyId === a.id}
                              className="btn btn-gold btn-sm"
                            >
                              Unsuspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={appPage}
            totalPages={appPagination?.totalPages ?? 1}
            total={appPagination?.total ?? 0}
            perPage={PER_PAGE}
            onPageChange={setAppPage}
          />
        </div>
      )}
    </div>
  );
}
