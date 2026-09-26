'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

const items = [
  ['/community/manage', 'Courses'],
  ['/community/manage/events', 'Events'],
  ['/community/manage/challenges', 'Challenges'],
  ['/community/manage/moderation', 'Moderation & ops'],
] as const;

export function CommunityAdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Growth Club management">
      {items.map(([href, label]) => {
        const active = href === '/community/manage' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href as Route}
            className={
              active
                ? 'shrink-0 rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-cream-50'
                : 'shrink-0 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-600'
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
