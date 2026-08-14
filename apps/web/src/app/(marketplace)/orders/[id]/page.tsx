'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@creatormarket/ui';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { AdinkraMark } from '@/components/brand/adinkra';

const TIMELINE_STEPS = [
  { key: 'placed', label: 'Order placed', desc: 'We have received your order' },
  { key: 'paid', label: 'Payment received', desc: 'Your payment was confirmed' },
  { key: 'delivered', label: 'Delivered', desc: 'Your files are available for download' },
  { key: 'completed', label: 'Completed', desc: 'Your order is complete' },
];

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/auth/login');
      return;
    }
    loadOrder();
  }, [token, orderId]);

  const loadOrder = async () => {
    try {
      setIsLoading(true);
      const data = await api.getOrder(token!, orderId);
      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'FULFILLED':
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-700';
      case 'REFUNDED':
      case 'FAILED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Payment pending';
      case 'PROCESSING': return 'Processing';
      case 'PAID': return 'Paid';
      case 'FULFILLED': return 'Delivered';
      case 'COMPLETED': return 'Completed';
      case 'FAILED': return 'Payment failed';
      case 'CANCELLED': return 'Cancelled';
      case 'REFUNDED': return 'Refunded';
      default: return status;
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return null;
    return new Date(date).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const stepState = (step: string) => {
    if (!order) return 'future';
    const status = order.status;
    if (status === 'REFUNDED' || status === 'FAILED' || status === 'CANCELLED') {
      return step === 'placed' ? 'current' : 'future';
    }
    const rank = { PENDING: 0, PROCESSING: 1, PAID: 1, FULFILLED: 2, COMPLETED: 3 };
    const current = rank[status as keyof typeof rank] ?? -1;
    const stepRank = TIMELINE_STEPS.findIndex((s) => s.key === step);
    if (stepRank < current) return 'done';
    if (stepRank === current) return 'current';
    return 'future';
  };

  const stepTime = (step: string) => {
    if (!order) return null;
    if (step === 'placed') return order.createdAt;
    if (step === 'paid') return order.payment?.status === 'SUCCEEDED' ? order.payment.createdAt : null;
    if (step === 'delivered' && ['FULFILLED', 'COMPLETED'].includes(order.status)) return order.updatedAt;
    if (step === 'completed' && order.status === 'COMPLETED') return order.updatedAt;
    return null;
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-40 animate-pulse rounded-2xl bg-cream-100" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-cream-100" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <AdinkraMark className="mx-auto h-12 w-12 text-ink-200" />
        <h2 className="mt-4 font-display text-2xl font-bold text-ink-900">Order not found</h2>
        <p className="mt-2 text-sm text-ink-500">{error || 'This order does not exist or you do not have access to it.'}</p>
        <Link href="/dashboard/purchases" className="mt-6 inline-block font-semibold text-forest-700 hover:underline">
          Back to my purchases
        </Link>
      </div>
    );
  }

  const isSpecial = ['REFUNDED', 'FAILED', 'CANCELLED'].includes(order.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-ink-400">
        <Link href="/" className="hover:text-forest-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/dashboard/purchases" className="hover:text-forest-700">Purchases</Link>
        <span className="mx-2">/</span>
        <span className="text-ink-900">Order {order.invoiceNumber}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Order {order.invoiceNumber}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Placed {formatDate(order.createdAt)}
          </p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide', statusColor(order.status))}>
          {statusLabel(order.status)}
        </span>
      </div>

      {isSpecial && (
        <div className={cn(
          'mt-6 rounded-2xl px-5 py-4 text-sm font-medium',
          order.status === 'REFUNDED' ? 'bg-red-50 text-red-700' : 'bg-cream-100 text-ink-700',
        )}>
          {order.status === 'REFUNDED'
            ? 'This order was refunded. If you believe this is a mistake, please contact support.'
            : order.status === 'FAILED'
              ? 'Payment for this order failed. You can retry checkout from your cart.'
              : 'This order was cancelled before payment was completed.'}
        </div>
      )}

      {/* Status timeline */}
      <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
        <h2 className="font-display text-lg font-semibold text-ink-900">Order status</h2>
        <ol className="mt-6">
          {TIMELINE_STEPS.map((step, i) => {
            const state = stepState(step.key);
            const time = stepTime(step.key);
            return (
              <li key={step.key} className="relative flex gap-4 pb-8 last:pb-0">
                {i < TIMELINE_STEPS.length - 1 && (
                  <span
                    className={cn(
                      'absolute left-[15px] top-8 h-full w-0.5',
                      state === 'done' || ['delivered', 'completed'].indexOf(TIMELINE_STEPS[i + 1].key) >= 0 && stepState(TIMELINE_STEPS[i + 1].key) === 'done'
                        ? 'bg-forest-500'
                        : 'bg-ink-100',
                    )}
                  />
                )}
                <span className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  {state === 'done' ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-700 text-cream-50">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  ) : (
                    <span className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold',
                      state === 'current' ? 'border-forest-700 bg-forest-50 text-forest-700' : 'border-ink-200 bg-white text-ink-300',
                    )}>
                      {i + 1}
                    </span>
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className={cn(
                      'text-sm font-semibold',
                      state === 'future' ? 'text-ink-400' : 'text-ink-900',
                    )}>
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">{step.desc}</p>
                  </div>
                  {time && state !== 'future' && (
                    <p className="shrink-0 text-xs text-ink-400">{formatDate(time)}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Items */}
      <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
        <h2 className="font-display text-lg font-semibold text-ink-900">Items</h2>
        <ul className="mt-4 divide-y divide-ink-100">
          {order.items?.map((item: any) => (
            <li key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-cream-100">
                {item.product?.thumbnail ? (
                  <img src={item.product.thumbnail} alt={item.productName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <svg className="h-5 w-5 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {item.product?.slug ? (
                  <Link href={`/products/${item.product.slug}`} className="block truncate text-sm font-medium text-ink-900 hover:text-forest-700">
                    {item.productName}
                  </Link>
                ) : (
                  <p className="truncate text-sm font-medium text-ink-900">{item.productName}</p>
                )}
                <p className="mt-0.5 text-xs capitalize text-ink-400">{item.licenseType} license · Qty {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-ink-900">{formatNaira(item.totalPrice)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
          <p className="text-sm font-semibold text-ink-900">Total</p>
          <p className="text-lg font-bold text-forest-900">{formatNaira(order.totalAmount)}</p>
        </div>
      </div>

      {/* Payment */}
      {order.payment && (
        <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
          <h2 className="font-display text-lg font-semibold text-ink-900">Payment</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-400">Method</dt>
              <dd className="text-ink-900 capitalize">{order.payment.provider}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-400">Amount</dt>
              <dd className="text-ink-900">{formatNaira(order.payment.amount)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-ink-400">Reference</dt>
              <dd className="min-w-0 break-all text-right font-mono text-xs text-ink-900">
                {order.payment.providerPaymentId || order.payment.stripePaymentIntentId || '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-400">Date</dt>
              <dd className="text-ink-900">{formatDate(order.payment.createdAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-400">Status</dt>
              <dd className="font-medium text-ink-900">{order.payment.status}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Refund */}
      {order.refunds && order.refunds.length > 0 && (
        <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/50 p-6">
          <h2 className="font-display text-lg font-semibold text-red-800">Refund request</h2>
          {order.refunds.map((refund: any) => (
            <div key={refund.id} className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-red-700/70">Reason</dt>
                <dd className="text-red-900">{refund.reason}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-red-700/70">Status</dt>
                <dd className="font-medium capitalize text-red-900">{refund.status.toLowerCase()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-red-700/70">Requested</dt>
                <dd className="text-red-900">{formatDate(refund.createdAt)}</dd>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          href="/dashboard/downloads"
          className="w-full rounded-full bg-forest-800 px-6 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-colors hover:bg-forest-700 sm:w-auto"
        >
          View Downloads
        </Link>
        <Link
          href="/dashboard/purchases"
          className="w-full rounded-full border border-forest-300 bg-white px-6 py-3 text-sm font-semibold text-forest-800 transition-colors hover:bg-cream-100 sm:w-auto"
        >
          My Purchases
        </Link>
        <Link
          href="/products"
          className="w-full rounded-full border border-ink-100 bg-white px-6 py-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-cream-100 sm:w-auto"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
