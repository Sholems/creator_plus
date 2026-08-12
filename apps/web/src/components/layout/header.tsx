'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { CreatorPlusMark } from '@/components/brand/logo';
import { NotificationBell } from '@/components/layout/notification-bell';

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3002';

function isAdmin(roles?: string[]) {
  return !!roles?.some((r) => r === 'super_admin' || r === 'admin');
}

const NAV_LINKS: { href: Route; label: string }[] = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/categories', label: 'Categories' },
  { href: '/creators', label: 'Creators' },
  { href: '/sell', label: 'Sell' },
  { href: '/earn', label: 'Earn' },
];

export function Header() {
  const { token, user, isCreator, logout } = useAuth();
  const admin = isAdmin(user?.roles);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const linkClass = (active = false) =>
    `text-sm font-medium transition-colors hover:text-gold-300 ${
      active ? 'text-gold-300' : 'text-cream-100/80'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-forest-900 text-cream-50 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2">
            <CreatorPlusMark className="h-9 w-9 shrink-0 transition-transform duration-300 group-hover:scale-105" />
            <span className="font-display text-2xl font-bold leading-none tracking-tight">
              <span className="text-white">Creator</span>
              <span className="text-gold-400">Plus</span>
            </span>
          </Link>

          {/* Desktop Navigation — centered */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(false)}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Naira indicator */}
            <span className="hidden lg:inline-flex items-center gap-1 rounded-full border border-gold-400/40 bg-gold-400/10 px-2.5 py-1 font-mono text-xs font-semibold text-gold-300">
              ₦ NGN
            </span>

            {/* Wishlist */}
            {token && (
              <Link href="/dashboard/wishlist" className="hidden sm:flex p-2 text-cream-100/80 hover:text-white" aria-label="Wishlist">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </Link>
            )}

            {/* Cart */}
            {token && (
              <Link href="/cart" className="relative p-2 text-cream-100/80 hover:text-white" aria-label="Cart">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </Link>
            )}

            {/* Notifications */}
            <NotificationBell />

            {/* Auth / User */}
            <div className="hidden sm:flex items-center gap-2">
              {token ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-cream-50 hover:bg-white/15"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-400 text-xs font-bold text-forest-900">
                      {user?.displayName?.[0] || user?.email?.[0] || '?'}
                    </div>
                    <span className="hidden lg:inline max-w-[10rem] truncate">
                      {user?.displayName || user?.email}
                    </span>
                    {isCreator && (
                      <span className="hidden sm:inline rounded-full bg-gold-400/20 px-2 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-wider text-gold-300">
                        Creator
                      </span>
                    )}
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-60 rounded-xl border border-ink-100 bg-white py-1.5 text-ink-800 shadow-xl z-50">
                      <p className="px-4 py-1.5 font-mono text-[0.625rem] font-semibold uppercase tracking-wider text-ink-400">
                        {user?.displayName || user?.email}
                      </p>
                      {isCreator ? (
                        <Link href="/creator" className="flex items-center justify-between px-4 py-2 text-sm hover:bg-cream-100"
                          onClick={() => setIsUserMenuOpen(false)}>
                          <span>Creator Studio</span>
                          <svg className="h-4 w-4 text-gold-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l2.4 7.6H22l-6.2 4.5 2.4 7.6-6.2-4.6-6.2 4.6 2.4-7.6L2 9.6h7.6z" />
                          </svg>
                        </Link>
                      ) : (
                        <Link href="/sell" className="block px-4 py-2 text-sm hover:bg-cream-100"
                          onClick={() => setIsUserMenuOpen(false)}>
                          Start selling
                        </Link>
                      )}
                      <Link href="/dashboard" className="block px-4 py-2 text-sm hover:bg-cream-100"
                        onClick={() => setIsUserMenuOpen(false)}>
                        Buyer Dashboard
                      </Link>
                      {admin && (
                        <a href={ADMIN_URL} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between px-4 py-2 text-sm text-gold-700 hover:bg-gold-50">
                          <span>Admin Console</span>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                      <Link href="/dashboard/settings" className="block px-4 py-2 text-sm hover:bg-cream-100"
                        onClick={() => setIsUserMenuOpen(false)}>
                        Settings
                      </Link>
                      <hr className="my-1 border-ink-100" />
                      <button
                        onClick={() => { logout(); setIsUserMenuOpen(false); }}
                        className="block w-full px-4 py-2 text-left text-sm text-clay-600 hover:bg-clay-50"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/auth/login" className="rounded-full px-4 py-2 text-sm font-medium text-cream-100/90 hover:bg-white/10 hover:text-white">
                    Log in
                  </Link>
                  <Link href="/auth/register" className="rounded-full bg-gold-400 px-4 py-2 text-sm font-semibold text-forest-900 shadow-sm hover:bg-gold-300">
                    Sign up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="md:hidden p-2 text-cream-100/80 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <nav className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm font-medium text-cream-100/90 hover:text-gold-300" onClick={() => setIsMenuOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <hr className="border-white/10" />
              {token ? (
                <>
                  {isCreator ? (
                    <Link href="/creator" className="text-sm font-medium text-cream-100/90" onClick={() => setIsMenuOpen(false)}>
                      Creator Studio
                    </Link>
                  ) : (
                    <Link href="/sell" className="text-sm font-medium text-gold-300" onClick={() => setIsMenuOpen(false)}>
                      Start selling
                    </Link>
                  )}
                  <Link href="/dashboard" className="text-sm font-medium text-cream-100/90" onClick={() => setIsMenuOpen(false)}>
                    Buyer Dashboard
                  </Link>
                  {admin && (
                    <a href={ADMIN_URL} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium text-gold-300">
                      Admin Console
                    </a>
                  )}
                  <button onClick={() => { logout(); setIsMenuOpen(false); }} className="text-left text-sm font-medium text-gold-300">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="text-sm font-medium text-cream-100/90" onClick={() => setIsMenuOpen(false)}>
                    Log in
                  </Link>
                  <Link href="/auth/register" className="text-sm font-medium text-gold-300" onClick={() => setIsMenuOpen(false)}>
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
