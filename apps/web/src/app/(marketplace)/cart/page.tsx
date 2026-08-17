'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { AdinkraMark } from '@/components/brand/adinkra';
import { PaymentProviderPicker } from '@/components/market/payment-provider-picker';

function Breadcrumbs() {
  return (
    <nav className="flex items-center gap-2 text-sm text-ink-400">
      <Link href="/" className="transition-colors hover:text-forest-700">Home</Link>
      <span>/</span>
      <span className="font-medium text-ink-700">Cart</span>
    </nav>
  );
}

export default function CartPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [provider, setProvider] = useState('paystack');
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [usingWallet, setUsingWallet] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (token) loadCart();
  }, [token]);

  useEffect(() => {
    if (token) {
      api
        .getWallet(token)
        .then(setWallet)
        .catch(() => {});
    }
  }, [token]);

  const loadCart = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const data = await api.getCart(token);
      setCart(data);
    } catch (err) {
      console.error('Failed to load cart:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantity = async (itemId: string, quantity: number) => {
    if (!token || quantity < 1) return;
    setUpdating(itemId);
    try {
      const data = await api.updateCartItem(token, itemId, quantity);
      setCart(data);
    } catch (err: any) {
      setError(err.message || 'Failed to update cart');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemove = async (itemId: string) => {
    if (!token) return;
    try {
      const data = await api.removeFromCart(token, itemId);
      setCart(data);
    } catch (err: any) {
      setError(err.message || 'Failed to remove item');
    }
  };

  const handleApplyCoupon = async () => {
    if (!token || !cart || !couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const items = cart.items.map((item: any) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));
      const result = await api.validateCoupon(token, couponCode.trim(), items);
      if (!result.valid) {
        setCouponError('This coupon cannot be applied to your cart.');
        setCouponApplied(null);
        return;
      }
      setCouponApplied({
        code: result.coupon.code,
        couponId: result.coupon.id,
        discountAmount: result.discountAmount,
      });
    } catch (err: any) {
      setCouponError(err.message || 'Could not apply coupon');
      setCouponApplied(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleCheckout = async () => {
    if (!token || !cart || cart.items.length === 0) return;
    setIsPaying(true);
    setError('');
    try {
      const items = cart.items.map((item: any) => ({
        productId: item.product.id,
        quantity: item.quantity,
        licenseType: item.licenseType,
      }));
      const order = await api.createOrder(token, items, {
        couponCode: couponApplied?.code || undefined,
      });

      if (usingWallet) {
        await api.payWithWallet(token, order.id);
        router.push(`/orders/${order.id}`);
        return;
      }

      const checkout = await api.createCheckout(token, order.id, provider);
      window.location.href = checkout.url;
    } catch (err: any) {
      setError(err.message || 'Failed to checkout');
      setIsPaying(false);
    }
  };

  const totalAfterDiscount = cart
    ? cart.totalAmount - (couponApplied?.discountAmount || 0)
    : 0;
  const walletBalance = wallet ? Number(wallet.availableBalance || 0) : 0;
  const canPayWithWallet = wallet && walletBalance >= totalAfterDiscount;

  if (!token) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
        <div className="text-center">
          <AdinkraMark className="mx-auto h-10 w-10" />
          <h2 className="mt-4 text-2xl font-bold text-ink-900">Sign in to view your cart</h2>
          <p className="mt-2 text-sm text-ink-500">You need an account to make purchases.</p>
          <Link href="/auth/login" className="mt-4 inline-block font-semibold text-forest-700 hover:text-forest-600">
            Sign in →
          </Link>
          <p className="mt-2 text-xs text-ink-400">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="font-medium text-forest-700 hover:text-forest-600">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs />
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
        Shopping cart
      </h1>

      {error && (
        <div className="mt-5 rounded-xl border border-clay-200 bg-clay-50 p-4 text-sm text-clay-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="mt-8 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-cream-100" />
          ))}
        </div>
      ) : !cart || cart.items.length === 0 ? (
        <div className="surface-card mt-8 px-6 py-16 text-center">
          <svg className="mx-auto h-12 w-12 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-3 font-display text-lg font-semibold text-ink-900">Your cart is empty</h3>
          <p className="mt-1 text-sm text-ink-500">The market is waiting for you.</p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest-800 px-6 py-2.5 text-sm font-semibold text-cream-50 hover:bg-forest-700"
          >
            Browse the market →
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {cart.items.map((item: any) => (
              <div key={item.id} className="surface-card flex items-center gap-4 p-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cream-100">
                  {item.product?.thumbnail ? (
                    <Image
                      src={item.product.thumbnail}
                      alt={item.product.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <svg className="h-6 w-6 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.product?.slug}`} className="block truncate font-display font-semibold text-ink-900 hover:text-forest-700">
                    {item.product?.title}
                  </Link>
                  <p className="mt-0.5 text-xs capitalize text-ink-500">{item.licenseType} license</p>
                  <p className="text-xs text-ink-400">{item.product?.creator?.storeName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1 || updating === item.id}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-100 text-ink-600 hover:bg-cream-100 disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-mono text-sm">{item.quantity}</span>
                  <button
                    onClick={() => handleQuantity(item.id, item.quantity + 1)}
                    disabled={updating === item.id}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-100 text-ink-600 hover:bg-cream-100 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <p className="price-tag w-24 text-right font-bold text-ink-900">
                  {formatNaira(Number(item.product?.price || 0) * item.quantity)}
                </p>
                <button onClick={() => handleRemove(item.id)} className="text-ink-300 hover:text-clay-600" aria-label="Remove item">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="surface-card sticky top-24 p-6">
              <h2 className="font-display text-lg font-semibold text-ink-900">Order summary</h2>

              <div className="mt-4">
                <p className="eyebrow text-ink-400">Coupon code</p>
                {couponApplied ? (
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-forest-50 px-3 py-2 text-sm">
                    <span className="font-mono font-semibold text-forest-800">{couponApplied.code}</span>
                    <button onClick={handleRemoveCoupon} className="font-medium text-ink-500 hover:text-clay-600">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="e.g. LAUNCH10"
                      className="block w-full rounded-xl border border-ink-100 bg-cream-50 px-3 py-2 font-mono text-sm uppercase tracking-wide text-ink-900 placeholder:normal-case placeholder:text-ink-300 focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="shrink-0 rounded-xl bg-forest-800 px-4 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-700 disabled:opacity-50"
                    >
                      {couponLoading ? '…' : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError && <p className="mt-2 text-xs font-medium text-clay-600">{couponError}</p>}
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between text-ink-500">
                  <span>Items ({cart.itemCount})</span>
                  <span className="font-medium text-ink-900">{formatNaira(cart.totalAmount)}</span>
                </div>
                {couponApplied && Number(couponApplied.discountAmount) > 0 && (
                  <div className="flex items-center justify-between text-forest-700">
                    <span>Discount ({couponApplied.code})</span>
                    <span className="font-medium">−{formatNaira(couponApplied.discountAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-ink-100 pt-3">
                  <span className="font-display text-base font-semibold text-ink-900">Total</span>
                  <span className="price-tag text-xl font-bold text-forest-900">
                    {formatNaira(totalAfterDiscount)}
                  </span>
                </div>
              </div>

              {/* Payment method */}
              <div className="mt-6">
                <PaymentProviderPicker value={provider} onChange={setProvider} />
              </div>

              {/* Wallet option */}
              {wallet && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (canPayWithWallet) setUsingWallet(!usingWallet);
                    }}
                    disabled={!canPayWithWallet}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      usingWallet && canPayWithWallet
                        ? 'border-forest-500 bg-forest-50 ring-1 ring-forest-500'
                        : canPayWithWallet
                          ? 'border-ink-100 bg-white hover:border-forest-300'
                          : 'border-ink-100 bg-cream-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          usingWallet && canPayWithWallet ? 'border-forest-500' : 'border-ink-200'
                        }`}
                      >
                        {usingWallet && canPayWithWallet && (
                          <span className="h-2.5 w-2.5 rounded-full bg-forest-500" />
                        )}
                      </span>
                      <div className="flex-1">
                        <span className="block font-display text-sm font-semibold text-ink-900">
                          Pay with CreatorPlus Wallet
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-500">
                          Balance: {formatNaira(walletBalance)}
                          {!canPayWithWallet && (
                            <span className="ml-1 text-clay-600">
                              (insufficient — need {formatNaira(totalAfterDiscount)})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={isPaying || (usingWallet && !canPayWithWallet)}
                className="mt-6 w-full rounded-full bg-forest-800 px-6 py-3.5 font-semibold text-cream-50 shadow-sm transition-colors hover:bg-forest-700 disabled:opacity-50"
              >
                {isPaying
                  ? 'Processing…'
                  : usingWallet
                    ? `Pay ${formatNaira(totalAfterDiscount)} with Wallet`
                    : `Pay ${formatNaira(totalAfterDiscount)}`}
              </button>

              {/* Trust signals */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-ink-400">
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Secure
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Instant download
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  30-day guarantee
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
