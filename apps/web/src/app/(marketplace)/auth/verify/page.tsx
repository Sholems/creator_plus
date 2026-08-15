'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AdinkraMark, AdinkraField } from '@/components/brand/adinkra';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [error, setError] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setError('This verification link is missing its token.');
      setStatus('error');
      return;
    }

    api
      .verifyEmail(token)
      .then(() => setStatus('done'))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Verification failed');
        setStatus('error');
      });
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResendMessage('');
    try {
      await api.resendVerification(resendEmail);
      setResendMessage('If that email has an unverified account, a new link is on its way.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the link');
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-160px)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <AdinkraField patternId="adinkra-verify" className="text-gold-400/10" />
        <div className="absolute inset-0 bg-gradient-to-br from-gold-100/50 via-cream-50/70 to-forest-100/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_75%_at_50%_40%,rgba(251,248,241,0.98),rgba(251,248,241,0.92)_40%,rgba(251,248,241,0.7))]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <AdinkraMark className="mx-auto h-12 w-12" />
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink-900">Verify your email</h1>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-8 shadow-[0_8px_32px_rgba(10,46,34,0.08)]">
          {status === 'loading' && (
            <div className="py-6 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-forest-200 border-t-forest-700" />
              <p className="mt-4 text-sm text-ink-600">Confirming your email…</p>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest-100">
                <svg className="h-6 w-6 text-forest-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 font-display text-xl font-bold text-ink-900">Email verified!</h2>
              <p className="mt-2 text-sm text-ink-600">
                Your account is now verified. Welcome to CreatorPlus.
              </p>
              <button
                onClick={() => router.push('/auth/login')}
                className="mt-6 flex w-full justify-center rounded-full bg-forest-800 px-4 py-3 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-forest-700"
              >
                Continue to sign in
              </button>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="flex items-start gap-2 rounded-xl border border-clay-200 bg-clay-50 px-3 py-2.5 text-sm text-clay-700">
                <span>{error || 'This verification link is invalid or has expired.'}</span>
              </div>

              <div className="mt-5">
                <p className="text-sm text-ink-600">Need a fresh link? Enter your email below.</p>
                <form onSubmit={handleResend} className="mt-3 space-y-3">
                  {resendMessage && (
                    <div className="rounded-xl border border-forest-200 bg-forest-50 px-3 py-2.5 text-sm text-forest-700">
                      {resendMessage}
                    </div>
                  )}
                  <input
                    type="email"
                    required
                    autoFocus
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="block w-full rounded-xl border border-ink-100 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 transition focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30"
                  />
                  <button
                    type="submit"
                    className="flex w-full justify-center rounded-full border border-forest-300 bg-white px-4 py-2.5 text-sm font-semibold text-forest-800 transition hover:bg-cream-100"
                  >
                    Resend verification link
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-ink-500">
          Remembered your password?{' '}
          <Link href="/auth/login" className="font-semibold text-forest-700 hover:text-forest-600">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm text-ink-500">Loading…</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
