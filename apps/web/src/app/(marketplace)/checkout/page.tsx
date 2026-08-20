'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { AdinkraMark } from '@/components/brand/adinkra';
import { PaymentProviderPicker } from '@/components/market/payment-provider-picker';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState('paystack');
  const [isProcessing, setIsProcessing] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [usingWallet, setUsingWallet] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    if (token) {
      api
        .getWallet(token)
        .then(setWallet)
        .catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (orderId && token) {
      loadOrder(orderId);
    } else {
      setIsLoading(false);
    }
  }, [searchParams, token]);

  const loadOrder = async (orderId: string) => {
    try {
      const data = await api.getOrder(token!, orderId);
      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!token || !order || !couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponMessage('');
    try {
      const updated = await api.applyCoupon(token, order.id, couponCode.trim());
      setOrder(updated);
      setCouponMessage(`Coupon "${updated.coupon?.code}" applied! You saved ${formatNaira(updated.coupon?.discountAmount)}.`);
      setCouponCode('');
    } catch (err: any) {
      setCouponError(err.message);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    if (!token || !order) return;
    setCouponLoading(true);
    try {
      const updated = await api.removeCoupon(token, order.id);
      setOrder(updated);
      setCouponMessage('');
      setCouponError('');
    } catch (err: any) {
      setCouponError(err.message);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!token || !order) return;
    setIsProcessing(true);
    setError('');
    try {
      if (usingWallet) {
        await api.payWithWallet(token, order.id);
        router.push(`/orders/${order.id}`);
        return;
      }
      const checkout = await api.createCheckout(token, order.id, provider);
      window.location.href = checkout.url;
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <div className="text-center">
          <AdinkraMark className="mx-auto h-10 w-10 animate-pulse text-gold-500" />
          <p className="mt-4 text-sm text-ink-500">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
        <div className="text-center">
          <AdinkraMark className="mx-auto h-10 w-10" />
          <h2 className="mt-4 font-display text-2xl font-bold text-ink-900">Sign in to checkout</h2>
          <p className="mt-2 text-sm text-ink-500">Please sign in to complete your purchase.</p>
          <Link
            href="/auth/login"
            className="mt-4 inline-block rounded-full bg-forest-800 px-6 py-2.5 text-sm font-semibold text-cream-50 hover:bg-forest-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-ink-900">No order found</h2>
          <Link href="/products" className="mt-4 inline-block font-semibold text-forest-700 hover:underline">
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="eyebrow text-gold-600">Secure checkout</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
        Complete your order
      </h1>

      {error && (
        <div className="mt-5 rounded-xl border border-clay-200 bg-clay-50 p-4 text-sm text-clay-700">
          {error}
        </div>
      )}

      <div className="surface-card mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-ink-900">Order summary</h2>
          <span className="rounded-full bg-cream-100 px-3 py-1 font-mono text-xs text-ink-500">
            {order.id.slice(0, 8)}…{order.id.slice(-4)}
          </span>
        </div>

        <div className="mt-4 divide-y divide-ink-100">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-cream-100">
                  {item.product?.thumbnail ? (
                    <img
                      src={item.product.thumbnail}
                      alt={item.product?.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg className="h-6 w-6 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <Link href={`/products/${item.product?.slug}`} className="font-medium text-ink-900 hover:text-forest-700">
                    {item.product?.title}
                  </Link>
                  <p className="text-xs capitalize text-ink-500">{item.licenseType} license · {item.quantity}</p>
                </div>
              </div>
              <p className="font-medium text-ink-900">{formatNaira(item.totalPrice)}</p>
            </div>
          ))}
        </div>

        {/* Coupon input */}
        <div className="mt-4 border-t border-ink-100 pt-4">
          {order.couponCode ? (
            <div className="flex items-center justify-between rounded-xl border border-forest-200 bg-forest-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏷️</span>
                <div>
                  <p className="text-sm font-semibold text-forest-800">{order.couponCode}</p>
                  <p className="text-xs text-forest-600">
                    {formatNaira(order.discountAmount)} discount applied
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveCoupon}
                disabled={couponLoading}
                className="text-xs font-medium text-clay-600 hover:text-clay-800 disabled:opacity-50"
              >
                {couponLoading ? 'Removing…' : 'Remove'}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    setCouponError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 transition-colors focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-cream-100 disabled:opacity-50"
                >
                  {couponLoading ? 'Applying…' : 'Apply'}
                </button>
              </div>
              {couponError && (
                <p className="mt-2 text-xs text-clay-600">{couponError}</p>
              )}
              {couponMessage && (
                <p className="mt-2 text-xs text-forest-600">{couponMessage}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-ink-100 pt-4">
          {order.discountAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-ink-500">Subtotal</p>
              <p className="text-ink-500 line-through">{formatNaira(Number(order.totalAmount) + Number(order.discountAmount))}</p>
            </div>
          )}
          {order.discountAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-forest-600">Discount ({order.couponCode})</p>
              <p className="text-forest-600">-{formatNaira(order.discountAmount)}</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-bold text-ink-900">Total</p>
            <p className="price-tag text-xl font-bold text-forest-900">{formatNaira(order.totalAmount)}</p>
          </div>
        </div>
      </div>

      <div className="surface-card mt-6 p-6">
        <PaymentProviderPicker value={provider} onChange={setProvider} />

        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-ink-100 bg-white p-4">
          <input
            type="checkbox"
            checked={usingWallet}
            onChange={(e) => setUsingWallet(e.target.checked)}
            disabled={wallet && Number(wallet.availableBalance || 0) < Number(order.totalAmount)}
            className="h-4 w-4 rounded border-ink-200 text-forest-700 focus:ring-forest-500"
          />
          <span className="flex-1 text-sm">
            <span className="block font-medium text-ink-900">Pay with CreatorPlus Wallet</span>
            <span className="mt-0.5 block text-xs text-ink-500">
              {wallet
                ? `Balance: ${formatNaira(wallet.availableBalance)}`
                : 'Balance unavailable'}
            </span>
          </span>
        </label>
      </div>

      <button
        onClick={handleCheckout}
        disabled={isProcessing || (usingWallet && wallet && Number(wallet.availableBalance || 0) < Number(order.totalAmount))}
        className="mt-6 w-full rounded-full bg-forest-800 px-6 py-3.5 font-semibold text-cream-50 shadow-sm transition-colors hover:bg-forest-700 disabled:opacity-60"
      >
        {isProcessing
          ? 'Processing…'
          : usingWallet
            ? 'Pay with Wallet'
            : `Pay ${formatNaira(order.totalAmount)} securely`}
      </button>

      <p className="mt-4 text-center text-xs text-ink-400">
        {usingWallet
          ? 'Payment will be deducted from your CreatorPlus Wallet balance. Instant delivery after payment.'
          : `You'll be redirected to ${provider === 'stripe' ? 'Stripe' : provider === 'flutterwave' ? 'Flutterwave' : 'Paystack'} to complete payment.
            Instant delivery after payment. 30-day money-back guarantee.`}
      </p>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
          <AdinkraMark className="mx-auto h-10 w-10 animate-pulse text-gold-500" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
