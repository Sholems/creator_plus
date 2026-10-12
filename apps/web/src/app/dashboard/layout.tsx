'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { AccountNav } from '@/components/layout/account-nav';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, isLoading } = useAuth();

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
            <aside className="w-full shrink-0 md:w-72">
              <div className="sticky top-24">
                <AccountNav />
              </div>
            </aside>
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
