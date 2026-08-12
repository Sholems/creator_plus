'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { CreatorEmptyState } from '@/components/market/creator-empty-state';

export default function CreatorProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (token) {
      loadProducts();
    }
  }, [token, statusFilter]);

  const loadProducts = async () => {
    if (!token) return;
    try {
      const profile = await api.getCreatorProfile(token).catch(() => null);
      if (!profile) {
        setNoProfile(true);
        return;
      }
      const params: any = { creatorId: profile.id, perPage: 50 };
      if (statusFilter !== 'all') {
        params.status = statusFilter.toUpperCase();
      }
      const data = await api.getProducts(params, token);
      setProducts(data.data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (id: string) => {
    if (!token) return;
    try {
      await api.publishProduct(token, id);
      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to submit for review');
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-100 text-green-700';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'DRAFT': return 'bg-gray-100 text-gray-700';
      case 'REJECTED': return 'bg-red-100 text-red-700';
      case 'ARCHIVED': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
        <Link
          href="/creator/products/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Add New Product
        </Link>
      </div>

      {noProfile ? (
        <CreatorEmptyState />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending Review</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first product.</p>
              <div className="mt-6">
                <Link
                  href="/creator/products/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Product
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                      {product.thumbnail ? (
                        <img src={product.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{product.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(product.status)}`}>
                          {product.status}
                        </span>
                        <span className="text-sm text-gray-500">{formatNaira(product.price)}</span>
                        <span className="text-xs text-gray-400">{product.category?.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {product.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublish(product.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Submit for Review
                      </button>
                    )}
                    <Link
                      href={`/creator/products/${String(product.id)}/edit` as Route}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-forest-50 text-forest-700 border border-forest-200 hover:bg-forest-100"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/products/${product.slug}`}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
