'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';

export default function WishlistPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadWishlist();
    }
  }, [token]);

  const loadWishlist = async () => {
    if (!token) return;
    try {
      const data = await api.getWishlist(token);
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load wishlist:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (productId: string) => {
    if (!token) return;
    try {
      await api.removeFromWishlist(token, productId);
      setItems(items.filter((item) => item.product?.id !== productId));
    } catch (err: any) {
      alert(err.message || 'Failed to remove from wishlist');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Wishlist</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-200" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Your wishlist is empty</h3>
              <p className="mt-1 text-sm text-gray-500">Save products you love for later.</p>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const product = item.product;
                if (!product) return null;
                return (
                  <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                    <Link href={`/products/${product.slug}`} className="block">
                      <div className="aspect-video rounded-lg bg-gray-100 overflow-hidden">
                        {product.thumbnail ? (
                          <img src={product.thumbnail} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">{product.title}</h3>
                      <p className="text-xs text-gray-500">{product.creator?.storeName}</p>
                      <p className="mt-1 text-lg font-bold text-gray-900">{formatNaira(product.price)}</p>
                    </Link>
                    <button
                      onClick={() => handleRemove(product.id)}
                      className="mt-2 text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
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
