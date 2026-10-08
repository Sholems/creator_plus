'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { CreatorPlusMark } from '@/components/brand/logo';
import { NotificationBell } from '@/components/layout/notification-bell';
import { ADMIN_URL } from '@/lib/env';

function isAdmin(roles?: string[]) {
  return !!roles?.some((r) => r === 'super_admin' || r === 'admin');
}

const NAV_LINKS: { href: Route; label: string }[] = [
  { href: '/community', label: 'Community' },
  { href: '/community/courses' as Route, label: 'Courses' },
  { href: '/community/events' as Route, label: 'Events' },
  { href: '/community/join' as Route, label: 'Membership' },
];

export function Header() {
  const { token, user, isCreator, logout } = useAuth();
  const admin = isAdmin(user?.roles);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Close mobile menu on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setIsUserMenuOpen(false);
      }
    },
    [],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close user dropdown when clicking outside
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const close = () => setIsUserMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [isUserMenuOpen]);

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
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(false)}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Notifications */}
            <NotificationBell />

            {/* Auth / User */}
            <div className="hidden sm:flex items-center gap-2">
              {token ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsUserMenuOpen(!isUserMenuOpen);
                    }}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-cream-50 hover:bg-white/15"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-400 text-xs font-bold text-forest-900">
                      {user?.displayName?.[0] || user?.email?.[0] || '?'}
                    </div>
                    <span className="hidden lg:inline max-w-[10rem] truncate">
                      {user?.displayName || user?.email}
                    </span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-60 rounded-xl border border-ink-100 bg-white py-1.5 text-ink-800 shadow-xl z-50">
                      <p className="px-4 py-1.5 font-mono text-[0.625rem] font-semibold uppercase tracking-wider text-ink-400">
                        {user?.displayName || user?.email}
                      </p>
                      <Link href="/community" className="block px-4 py-2 text-sm hover:bg-cream-100"
                        onClick={() => setIsUserMenuOpen(false)}>
                        Community Hub
                      </Link>
                      <Link href={'/community/courses' as Route} className="block px-4 py-2 text-sm hover:bg-cream-100"
                        onClick={() => setIsUserMenuOpen(false)}>
                        Courses & Learning
                      </Link>
                      <Link href={'/creator/qr-studio' as Route} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-cream-100"
                        onClick={() => setIsUserMenuOpen(false)}>
                        <span>QR Studio</span>
                        <span className="rounded bg-gold-100 px-1.5 py-0.5 text-[0.625rem] font-semibold text-gold-800">Tool</span>
                      </Link>
                      <Link href={'/community/saved' as Route} className="block px-4 py-2 text-sm hover:bg-cream-100"
                        onClick={() => setIsUserMenuOpen(false)}>
                        Saved Posts
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
                      <Link href={'/community/settings' as Route} className="block px-4 py-2 text-sm hover:bg-cream-100"
                        onClick={() => setIsUserMenuOpen(false)}>
                        Settings & Profile
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
              className="md:hidden p-2.5 text-cream-100/80 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div
          id="mobile-menu"
          role="navigation"
          aria-label="Mobile navigation"
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="flex flex-col gap-1 py-4 border-t border-white/10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-cream-100/90 hover:bg-white/10 hover:text-gold-300"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-2 border-white/10" />
            {token ? (
              <>
                <Link href="/community" className="rounded-lg px-3 py-2.5 text-sm font-medium text-cream-100/90 hover:bg-white/10" onClick={() => setIsMenuOpen(false)}>
                  Community Hub
                </Link>
                <Link href={'/community/courses' as Route} className="rounded-lg px-3 py-2.5 text-sm font-medium text-cream-100/90 hover:bg-white/10" onClick={() => setIsMenuOpen(false)}>
                  Courses & Learning
                </Link>
                <Link href={'/creator/qr-studio' as Route} className="rounded-lg px-3 py-2.5 text-sm font-medium text-gold-300 hover:bg-white/10" onClick={() => setIsMenuOpen(false)}>
                  QR Studio Tool
                </Link>
                <Link href={'/community/saved' as Route} className="rounded-lg px-3 py-2.5 text-sm font-medium text-cream-100/90 hover:bg-white/10" onClick={() => setIsMenuOpen(false)}>
                  Saved Bookmarks
                </Link>
                {admin && (
                  <a href={ADMIN_URL} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-gold-300 hover:bg-white/10">
                    Admin Console
                  </a>
                )}
                <Link href={'/community/settings' as Route} className="rounded-lg px-3 py-2.5 text-sm font-medium text-cream-100/90 hover:bg-white/10" onClick={() => setIsMenuOpen(false)}>
                  Settings & Profile
                </Link>
                <button onClick={() => { logout(); setIsMenuOpen(false); }} className="text-left rounded-lg px-3 py-2.5 text-sm font-medium text-clay-400 hover:bg-white/10">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="rounded-lg px-3 py-2.5 text-sm font-medium text-cream-100/90 hover:bg-white/10" onClick={() => setIsMenuOpen(false)}>
                  Log in
                </Link>
                <Link href="/auth/register" className="rounded-lg px-3 py-2.5 text-sm font-medium text-gold-300 hover:bg-white/10" onClick={() => setIsMenuOpen(false)}>
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
