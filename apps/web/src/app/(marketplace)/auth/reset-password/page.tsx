'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api } from '@/lib/api';
import { AdinkraMark, AdinkraField } from '@/components/brand/adinkra';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('This reset link is missing its token. Request a new reset link.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await api.resetPassword(token, password);
      setMessage('Your password has been updated. Sign in with your new password.');
      setPassword('');
      setConfirm('');
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-160px)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <AdinkraField patternId="adinkra-reset" className="text-gold-400/10" />
        <div className="absolute inset-0 bg-gradient-to-br from-gold-100/50 via-cream-50/70 to-forest-100/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_75%_at_50%_40%,rgba(251,248,241,0.98),rgba(251,248,241,0.92)_40%,rgba(251,248,241,0.7))]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <AdinkraMark className="mx-auto h-12 w-12" />
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink-900">Choose a new password</h1>
          <p className="mt-2 text-sm text-ink-600">
            Your reset link is valid for one hour.
          </p>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-8 shadow-[0_8px_32px_rgba(10,46,34,0.08)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-clay-200 bg-clay-50 px-3 py-2.5 text-sm text-clay-700">
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div className="flex items-start gap-2 rounded-xl border border-forest-200 bg-forest-50 px-3 py-2.5 text-sm text-forest-700">
                <span>{message}</span>
              </div>
            )}

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-700">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                autoFocus
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-ink-100 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 transition focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-ink-700">
                Confirm new password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="block w-full rounded-xl border border-ink-100 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 transition focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30"
                placeholder="Repeat your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-full bg-forest-800 px-4 py-3 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Updating…' : 'Reset password'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            <Link href="/auth/login" className="font-semibold text-forest-700 hover:text-forest-600">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
