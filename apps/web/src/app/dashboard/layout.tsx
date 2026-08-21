'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@creatormarket/ui';
import { useAuth } from '@/lib/auth';
import { DashboardSwitcher } from '@/components/market/dashboard-switcher';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const dashboardLinks: { href: Route; label: string }[] = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/purchases', label: 'My Purchases' },
  { href: '/dashboard/downloads', label: 'Downloads' },
  { href: '/dashboard/licenses' as Route, label: 'Licenses' },
  { href: '/dashboard/wishlist', label: 'Wishlist' },
  { href: '/dashboard/notifications', label: 'Notifications' },
  { href: '/dashboard/support', label: 'Support' },
  { href: '/dashboard/affiliates', label: 'Affiliate Program' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export default function DashboardLayout({
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
    <div className="flex min-h-screen flex-col bg-cream-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Sidebar */}
          <aside className="w-full shrink-0 md:w-72">
            <div className="sticky top-24">
              <DashboardSwitcher />
              <nav className="rounded-2xl border border-ink-100 bg-white p-4">
                <h2 className="mb-4 px-3 font-display text-lg font-semibold text-ink-900">
                  Buyer Dashboard
                </h2>
                <ul className="space-y-1">
                  {dashboardLinks.map((link) => {
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
                {isCreator && user?.creatorProfile && (
                  <div className="mt-4 rounded-xl bg-cream-50 p-3">
                    <p className="eyebrow text-gold-600">Your store</p>
                    <p className="mt-1 truncate text-sm font-medium text-ink-900">
                      {user.creatorProfile.storeName}
                    </p>
                    <Link
                      href="/creator"
                      className="mt-1 inline-block text-sm font-semibold text-forest-700 hover:text-forest-600"
                    >
                      Open Creator Studio →
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
      </main>
      <Footer />
    </div>
  );
}
