'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@creatorplus/ui';
import { useAuth } from '@/lib/auth';
import { DashboardSwitcher } from '@/components/market/dashboard-switcher';

const creatorLinks: { href: Route; label: string }[] = [
  { href: '/creator', label: 'Overview' },
  { href: '/creator/products', label: 'Products' },
  { href: '/creator/qr-studio' as Route, label: 'QR Studio' },
  { href: '/creator/orders' as Route, label: 'Sales' },
  { href: '/creator/events' as Route, label: 'Events' },
  { href: '/creator/coupons', label: 'Coupons' },
  { href: '/creator/licenses' as Route, label: 'Licenses' },
  { href: '/creator/store', label: 'Store Settings' },
  { href: '/creator/settings/security' as Route, label: 'Security' },
  { href: '/creator/analytics', label: 'Analytics' },
  { href: '/creator/earnings', label: 'Earnings' },
];

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, isLoading, isCreator, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, token, pathname, router]);

  return (
    <div className="bg-cream-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Sidebar */}
          <aside className="w-full shrink-0 md:w-72">
            <div className="sticky top-24">
              <DashboardSwitcher />
              <nav className="rounded-2xl border border-ink-100 bg-white p-4">
                <div className="mb-4 flex items-center justify-between px-3">
                  <h2 className="font-display text-lg font-semibold text-ink-900">
                    Creator Studio
                  </h2>
                  {isCreator && (
                    <span className="rounded-full bg-forest-100 px-2 py-0.5 text-xs font-semibold text-forest-700">
                      Creator
                    </span>
                  )}
                </div>
                <ul className="space-y-1">
                  {creatorLinks.map((link) => {
                    const active = pathname === link.href;
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={cn(
                            'block rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                            active
                              ? 'bg-forest-800 text-cream-50'
                              : 'text-ink-600 hover:bg-cream-100 hover:text-ink-900',
                          )}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {isCreator && user?.creatorProfile?.verified && (
                  <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-gold-50 px-3 py-2">
                    <svg className="h-4 w-4 text-gold-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l2.4 7.6H22l-6.2 4.5 2.4 7.6-6.2-4.6-6.2 4.6 2.4-7.6L2 9.6h7.6z" />
                    </svg>
                    <span className="eyebrow text-gold-700">Verified seller</span>
                  </div>
                )}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
