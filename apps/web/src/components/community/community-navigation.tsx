'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import {
  CalendarIcon,
  ChallengeIcon,
  DiscussIcon,
  HomeIcon,
  LearnIcon,
  MembersIcon,
} from './community-icons';

function QrIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className={className} aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v3M17 20h4M20 20v1" strokeLinecap="round" />
    </svg>
  );
}

const links = [
  { href: '/community', label: 'Home', icon: HomeIcon },
  { href: '/community/courses', label: 'Learn', icon: LearnIcon },
  { href: '/community/discussion', label: 'Discuss', icon: DiscussIcon },
  { href: '/community/members', label: 'Members', icon: MembersIcon },
  { href: '/community/events', label: 'Events', icon: CalendarIcon },
  { href: '/community/challenges', label: 'Challenges', icon: ChallengeIcon },
  { href: '/creator/qr-studio', label: 'QR Studio', icon: QrIcon },
] as const;

export function CommunityNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="CreatorPlus Community" className="community-nav">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === '/community' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href as Route}
            aria-current={active ? 'page' : undefined}
            className={active ? 'is-active' : ''}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
