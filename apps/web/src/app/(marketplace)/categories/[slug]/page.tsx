'use client';

import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';

const categoryMeta: Record<string, { icon: string; name: string; description: string }> = {
  ai: { icon: '🤖', name: 'AI', description: 'AI prompts, agents, and automation templates' },
  design: { icon: '🎨', name: 'Design', description: 'Canva templates, Figma UI kits, icons, fonts' },
  development: { icon: '💻', name: 'Development', description: 'Laravel, Next.js, React, Flutter, WordPress' },
  business: { icon: '📊', name: 'Business', description: 'Business plans, proposals, contracts' },
  education: { icon: '📚', name: 'Education', description: 'Lesson notes, worksheets, question banks' },
  books: { icon: '📖', name: 'Books', description: 'eBooks, guides, manuals, whitepapers' },
  audio: { icon: '🎵', name: 'Audio', description: 'Music, sound effects, podcast assets' },
  video: { icon: '🎬', name: 'Video', description: 'Stock videos, motion graphics, LUTs' },
  photography: { icon: '📷', name: 'Photography', description: 'Stock photos, textures, backgrounds' },
  '3d': { icon: '🧊', name: '3D', description: 'Blender assets, CAD files, SketchUp models' },
  architecture: { icon: '🏛️', name: 'Architecture', description: 'Building plans, interior designs' },
  marketing: { icon: '📣', name: 'Marketing', description: 'Social media kits, funnels, landing pages' },
  legal: { icon: '⚖️', name: 'Legal', description: 'NDAs, contracts, policy templates' },
  church: { icon: '⛪', name: 'Church', description: 'Sermon packs, Bible study resources' },
};

function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  const pages = new Set<number>();
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.add(i);
  } else {
    pages.add(1);
    pages.add(total);
    pages.add(current);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push('ellipsis');
    result.push(p);
    prev = p;
  }
  return result;
}

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const meta = categoryMeta[slug] || { icon: '📁', name: slug, description: '' };

  useEffect(() => {
    loadProducts();
  }, [slug, page]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const result = await api.getProducts({ categoryId: slug, page, perPage: 12 });
      setProducts(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/categories" className="hover:text-gray-700">Categories</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{meta.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{meta.icon}</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{meta.name}</h1>
            {meta.description && (
              <p className="mt-1 text-gray-600">{meta.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-gray-100 animate-pulse" />
                <div className="h-5 w-16 rounded bg-gray-200 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <span className="text-5xl">{meta.icon}</span>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">No products yet</h2>
          <p className="mt-2 text-gray-500">Be the first to list a product in {meta.name}</p>
          <Link
            href="/sell"
            className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Start Selling
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:shadow-md"
              >
                <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                  {product.thumbnail ? (
                    <img
                      src={product.thumbnail}
                      alt={product.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                    {product.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {product.creator?.storeName}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      {formatNaira(product.price)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {product.averageRating ? (
                        <span className="flex items-center gap-1">
                          <span className="text-yellow-400">★</span>
                          {product.averageRating.toFixed(1)}
                        </span>
                      ) : (
                        'New'
                      )}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              {buildPageNumbers(page, totalPages).map((p, idx) =>
                p === 'ellipsis' ? (
                  <span key={`e${idx}`} className="px-1 text-sm text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`h-10 w-10 rounded-lg text-sm font-medium ${
                      p === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
