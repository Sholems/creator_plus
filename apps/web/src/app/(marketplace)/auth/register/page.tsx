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

export default function RegisterPage() {
  const router = useRouter();
  const { register, refresh, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    wantToSell: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { password, confirmPassword, wantToSell, displayName, email } = formData;

  const strengthChecks = {
    length: password.length >= 12,
    case: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const strengthCount = Object.values(strengthChecks).filter(Boolean).length;
  const meterColor = ['bg-clay-500', 'bg-clay-500', 'bg-gold-500', 'bg-gold-500', 'bg-forest-600'][strengthCount];
  const meterLabel = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][strengthCount];

  const confirmMatch = confirmPassword.length > 0 ? password === confirmPassword : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const res = await register(email, password, displayName);

      if (wantToSell && res.accessToken) {
        await refresh().catch(() => undefined);
        router.push('/sell');
        return;
      }

      const next = new URLSearchParams(window.location.search).get('next');
      router.push(next && next.startsWith('/') ? (next as Route) : '/dashboard');
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
        <AdinkraField patternId="adinkra-register" className="text-gold-400/10" />
        <div className="absolute inset-0 bg-gradient-to-br from-gold-100/50 via-cream-50/70 to-forest-100/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_75%_at_50%_40%,rgba(251,248,241,0.98),rgba(251,248,241,0.92)_40%,rgba(251,248,241,0.7))]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <CreatorPlusMark className="mx-auto h-16 w-16 rounded-2xl shadow-[0_8px_24px_rgba(10,46,34,0.18)]" />
          <p className="eyebrow mt-5 text-[#7d520c]">Join the market</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-900">Create your account</h1>
          <p className="mt-2 text-sm text-ink-600">
            Buy from Africa&apos;s creators — or open your own stall.
          </p>
        </div>

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
              <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-ink-700">
                Full name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="name"
                required
                autoFocus
                value={displayName}
                onChange={(e) => {
                  setFormData({ ...formData, displayName: e.target.value });
                  if (error) setError('');
                }}
                className={inputClass}
                placeholder="Ada Lovelace"
              />
            </div>

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
                value={email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
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

              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${i < strengthCount ? meterColor : 'bg-ink-100'} transition-colors`} />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-ink-600">
                    {meterLabel} — at least 12 characters with a mix of upper &amp; lowercase, a number, and a symbol.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-ink-700">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    if (error) setError('');
                  }}
                  className={`${inputClass} pr-11`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-3 my-auto flex h-10 w-10 items-center justify-center rounded-lg text-ink-400 transition hover:text-ink-600"
                >
                  {showConfirm ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
              {confirmMatch !== null &&
                (confirmMatch ? (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-forest-600">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Passwords match
                  </p>
                ) : (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-clay-600">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                    Passwords don&apos;t match
                  </p>
                ))}
            </div>

            <div className="rounded-xl border border-ink-100 bg-cream-50 p-4">
              <div className="flex items-start">
                <input
                  id="wantToSell"
                  name="wantToSell"
                  type="checkbox"
                  checked={wantToSell}
                  onChange={(e) => setFormData({ ...formData, wantToSell: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-ink-200 text-gold-500 focus:ring-gold-500"
                />
                <label htmlFor="wantToSell" className="ml-2 block text-sm text-ink-700">
                  <span className="font-medium">I&apos;m here to sell digital products too</span>
                  <span className="block text-xs text-ink-600">
                    After you create your account, we&apos;ll walk you through setting up your store.
                  </span>
                </label>
              </div>
              {wantToSell && (
                <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ink-500">
                  <svg className="h-3.5 w-3.5 shrink-0 text-forest-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Next you&apos;ll name your store, upload your logo and cover, and go live.
                </p>
              )}
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border-ink-200 text-gold-500 focus:ring-gold-500"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-ink-600">
                I agree to the{' '}
                <Link href="/terms" className="font-medium text-forest-700 hover:text-forest-600">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="font-medium text-forest-700 hover:text-forest-600">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || authLoading}
              className="flex w-full justify-center rounded-full bg-forest-800 px-4 py-3 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold text-forest-700 hover:text-forest-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
