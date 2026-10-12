'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { AccountNav } from '@/components/layout/account-nav';

// The legacy Creator Studio pages are redirected away (next.config.ts); only
// QR Studio still lives here, inside the shared member account sidebar.
export default function CreatorLayout({
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
    <div className="bg-cream-50">
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
    </div>
  );
}
