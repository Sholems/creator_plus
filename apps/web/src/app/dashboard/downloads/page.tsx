'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function DownloadsPage() {
  const { token } = useAuth();
  const [downloads, setDownloads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadDownloads();
    }
  }, [token]);

  const loadDownloads = async () => {
    if (!token) return;
    try {
      const data = await api.getDownloads(token);
      setDownloads(data.data || []);
    } catch (err) {
      console.error('Failed to load downloads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (downloadToken: string, downloadId: string) => {
    if (!token) return;
    setDownloading(downloadId);
    try {
      const result = await api.recordDownload(token, downloadToken);
      if (result.files && result.files.length > 0) {
        result.files.forEach((file: any) => window.open(file.downloadUrl, '_blank'));
      } else if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      } else {
        alert(result.message || 'No files available for download');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to download');
    } finally {
      setDownloading(null);
    }
  };

  const isExpired = (expiresAt: string) => new Date() > new Date(expiresAt);
  const atLimit = (download: any) => download.downloadCount >= download.maxDownloads;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Downloads</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />
              ))}
            </div>
          ) : downloads.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No downloads yet</h3>
              <p className="mt-1 text-sm text-gray-500">Your purchased products will appear here.</p>
              <div className="mt-6">
                <Link
                  href="/products"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Browse Products
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {downloads.map((dl) => {
                const expired = isExpired(dl.expiresAt);
                const limit = atLimit(dl);
                const canDownload = !expired && !limit;

                return (
                  <div key={dl.id} className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                        {dl.product?.thumbnail ? (
                          <img src={dl.product.thumbnail} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{dl.product?.title || 'Product'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500 capitalize">{dl.orderItem?.licenseType} License</span>
                          <span className="text-xs text-gray-400">
                            {dl.downloadCount}/{dl.maxDownloads} downloads
                          </span>
                          {expired && (
                            <span className="text-xs text-red-500">Expired</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Purchased {dl.orderItem?.order?.createdAt
                            ? new Date(dl.orderItem.order.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(dl.token, dl.id)}
                      disabled={!canDownload || downloading === dl.id}
                      className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloading === dl.id ? 'Downloading...' : expired ? 'Expired' : limit ? 'Limit Reached' : 'Download'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
