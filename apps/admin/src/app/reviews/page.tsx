'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, PaginationMeta } from '@/lib/api';
import { Pagination } from '@/components/pagination';
import { useToast } from '@/lib/toast';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-gold-500" title={`${rating}/5`}>
      {'★'.repeat(rating)}
      <span className="text-ink-200">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

const PER_PAGE = 20;

export default function AdminReviewsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api
      .getReviews(token, { page, perPage: PER_PAGE })
      .then((res) => {
        setReviews(res.data || []);
        setPagination(res.pagination || null);
      })
      .catch((e) => toast(e.message || 'Failed to load reviews', 'error'))
      .finally(() => setLoading(false));
  }, [token, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleHide = async (id: string) => {
    if (!token) return;
    setBusyId(id);
    try {
      await api.hideReview(token, id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast('Review hidden');
    } catch (e: any) {
      toast(e.message || 'Failed to hide review', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (id: string) => {
    if (!token) return;
    setBusyId(id);
    try {
      await api.restoreReview(token, id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast('Review restored');
    } catch (e: any) {
      toast(e.message || 'Failed to restore review', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-gold-600">Trust &amp; Safety</p>
          <h1 className="page-title mt-1">Reported Reviews</h1>
        </div>
        <span className="badge badge-gold">
          {pagination?.total ?? reviews.length} to moderate
        </span>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-head-row">
                <th className="th">Product</th>
                <th className="th">Reviewer</th>
                <th className="th">Rating</th>
                <th className="th">Review</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr><td colSpan={5} className="td py-10 text-center text-ink-500">Loading…</td></tr>
              ) : reviews.length === 0 ? (
                <tr><td colSpan={5} className="td py-10 text-center text-ink-500">No reported reviews to moderate</td></tr>
              ) : (
                reviews.map((r) => (
                  <tr key={r.id} className="table-row-hover">
                    <td className="td font-medium text-ink-900">{r.product?.title || '—'}</td>
                    <td className="td text-ink-600">{r.buyer?.displayName || r.buyer?.email || '—'}</td>
                    <td className="td"><Stars rating={r.rating} /></td>
                    <td className="td text-ink-600">
                      {r.title && <span className="font-medium text-ink-900">{r.title}. </span>}
                      {r.comment || '—'}
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleHide(r.id)}
                          disabled={busyId === r.id}
                          className="btn btn-danger btn-sm"
                        >
                          Hide
                        </button>
                        <button
                          onClick={() => handleRestore(r.id)}
                          disabled={busyId === r.id}
                          className="btn btn-ghost btn-sm"
                        >
                          Restore
                        </button>
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
