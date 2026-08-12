'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, WEB_URL, PaginationMeta } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { SearchBox } from '@/components/search-box';
import { Pagination } from '@/components/pagination';
import { useToast } from '@/lib/toast';

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: 'badge-green',
  APPROVED: 'badge-green',
  PENDING: 'badge-gold',
  DRAFT: 'badge-gray',
  REJECTED: 'badge-red',
  ARCHIVED: 'badge-gray',
};

const PER_PAGE = 20;

export default function AdminProductsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api
      .getProducts(token, { status: status || undefined, search: search || undefined, page, perPage: PER_PAGE })
      .then((res) => {
        setProducts(res.data || []);
        setPagination(res.pagination || null);
      })
      .catch((e) => toast(e.message || 'Failed to load products', 'error'))
      .finally(() => setLoading(false));
  }, [token, status, search, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id: string) => {
    if (!token) return;
    setBusyId(id);
    try {
      await api.approveProduct(token, id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast('Product approved');
    } catch (e: any) {
      toast(e.message || 'Failed to approve product', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    const reason = window.prompt('Reason for rejection (sent to creator):') || undefined;
    setBusyId(id);
    try {
      await api.rejectProduct(token, id, reason);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast('Product rejected');
    } catch (e: any) {
      toast(e.message || 'Failed to reject product', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-gold-600">Catalog</p>
          <h1 className="page-title mt-1">Products</h1>
        </div>
        <span className="badge badge-gray">
          {pagination?.total ?? products.length} product{pagination?.total === 1 ? '' : 's'}
        </span>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="surface-card-header flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="input w-auto"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="PUBLISHED">Published</option>
              <option value="REJECTED">Rejected</option>
              <option value="ARCHIVED">Archived</option>
              <option value="DRAFT">Draft</option>
            </select>
            <SearchBox
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search title…"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-head-row">
                <th className="th">Product</th>
                <th className="th">Creator</th>
                <th className="th">Category</th>
                <th className="th">Price</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr><td colSpan={6} className="td py-10 text-center text-ink-500">Loading…</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="td py-10 text-center text-ink-500">No products found</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="table-row-hover">
                    <td className="td">
                      <span className="font-medium text-ink-900">{p.title}</span>
                      {p.slug && (
                        <a
                          href={`${WEB_URL}/products/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-xs font-medium text-gold-600 hover:text-gold-700"
                        >
                          View ↗
                        </a>
                      )}
                    </td>
                    <td className="td text-ink-600">{p.creator?.storeName || '—'}</td>
                    <td className="td text-ink-600">{p.category?.name || '—'}</td>
                    <td className="td price-tag text-ink-900">{formatNaira(p.price)}</td>
                    <td className="td">
                      <span className={`badge ${STATUS_STYLES[p.status] || 'badge-gray'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        {p.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={busyId === p.id}
                              className="btn btn-primary btn-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(p.id)}
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
          page={page}
          totalPages={pagination?.totalPages ?? 1}
          total={pagination?.total ?? 0}
          perPage={PER_PAGE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
