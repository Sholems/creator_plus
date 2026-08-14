'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { AdinkraField } from '@/components/brand/adinkra';
import { CreatorPlusMark } from '@/components/brand/logo';

function EyeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await login(email, password, remember);
      const next = new URLSearchParams(window.location.search).get('next');
      if (next && next.startsWith('/')) {
        router.push(next as Route);
      } else {
        router.push(res.user.creatorProfile ? '/creator' : '/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'block w-full rounded-xl border border-ink-100 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 transition focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30';

  return (
    <div className="relative flex min-h-[calc(100vh-160px)] items-center justify-center overflow-hidden px-4 py-12">
      {/* Soft ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <AdinkraField patternId="adinkra-login" className="text-gold-400/10" />
        <div className="absolute inset-0 bg-gradient-to-br from-gold-100/50 via-cream-50/70 to-forest-100/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_75%_at_50%_40%,rgba(251,248,241,0.98),rgba(251,248,241,0.92)_40%,rgba(251,248,241,0.7))]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <CreatorPlusMark className="mx-auto h-16 w-16 rounded-2xl shadow-[0_8px_24px_rgba(10,46,34,0.18)]" />
          <p className="eyebrow mt-5 text-[#7d520c]">Member sign-in</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-900">Welcome back</h1>
          <p className="mt-2 text-sm text-ink-600">Pick up right where you left off.</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-ink-100 bg-white p-8 shadow-[0_8px_32px_rgba(10,46,34,0.08)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-clay-200 bg-clay-50 px-3 py-2.5 text-sm text-clay-700">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className={`${inputClass} pr-11`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-3 my-auto flex h-10 w-10 items-center justify-center rounded-lg text-ink-400 transition hover:text-ink-600"
                >
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-200 text-gold-500 focus:ring-gold-500"
                />
                <span className="ml-2 text-sm text-ink-600">Keep me signed in</span>
              </label>
              <Link href="/auth/forgot-password" className="text-sm font-medium text-forest-700 hover:text-forest-600">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading || authLoading}
              className="flex w-full justify-center rounded-full bg-forest-800 px-4 py-3 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Switch */}
        <p className="mt-6 text-center text-sm text-ink-600">
          New to CreatorPlus?{' '}
          <Link href="/auth/register" className="font-semibold text-forest-700 hover:text-forest-600">
            Create a free account
          </Link>
        </p>
      </div>
    </div>
  );
}
