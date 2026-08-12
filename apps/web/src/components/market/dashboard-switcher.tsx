'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@creatormarket/ui';

export function DashboardSwitcher() {
  const { isCreator } = useAuth();
  const pathname = usePathname();
  const current = pathname.startsWith('/creator') ? 'creator' : 'buyer';

  return (
    <div className="mb-5 flex items-center gap-1 rounded-xl bg-cream-100 p-1">
      <Link
        href="/dashboard"
        aria-current={current === 'buyer' ? 'page' : undefined}
        className={cn(
          'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          current === 'buyer'
            ? 'bg-white text-forest-900 shadow-sm'
            : 'text-ink-600 hover:text-ink-900',
        )}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
        </svg>
        Buyer
      </Link>
      {isCreator ? (
        <Link
          href="/creator"
          aria-current={current === 'creator' ? 'page' : undefined}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            current === 'creator'
              ? 'bg-forest-800 text-cream-50 shadow-sm'
              : 'text-ink-600 hover:text-ink-900',
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l2.4 7.6H22l-6.2 4.5 2.4 7.6-6.2-4.6-6.2 4.6 2.4-7.6L2 9.6h7.6z" />
          </svg>
          Creator
        </Link>
      ) : (
        <Link
          href="/sell"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:text-ink-900"
          title="Become a creator"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Start selling
        </Link>
      )}
    </div>
  );
}
