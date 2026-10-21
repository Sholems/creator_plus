'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { AccountNav } from '@/components/layout/account-nav';

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

  const isQrStudio = pathname.startsWith('/creator/qr-studio');

  return (
    <div className="bg-cream-50">
      <div className={isQrStudio ? 'mx-auto max-w-[100rem] px-4 py-6 sm:px-6 lg:px-8' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
        <div className={isQrStudio ? 'block' : 'flex flex-col gap-8 md:flex-row'}>
          {!isQrStudio && (
            <aside className="w-full shrink-0 border-ink-100 md:w-64 md:border-r md:pr-6">
              <div className="sticky top-24">
                <AccountNav />
              </div>
            </aside>
          )}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
