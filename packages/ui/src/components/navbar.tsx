'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { cn } from '../lib/utils';

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface NavbarProps {
  items?: NavItem[];
  className?: string;
}

export function Navbar({ items = [], className }: NavbarProps) {
  return (
    <nav className={cn('flex items-center gap-6', className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href as Route}
          className={cn(
            'text-sm font-medium transition-colors hover:text-blue-600',
            item.active ? 'text-blue-600' : 'text-gray-600'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
