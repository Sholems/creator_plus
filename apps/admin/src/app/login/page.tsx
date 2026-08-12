'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { CreatorPlusMark } from '@/components/brand/logo';

function Diamond({ className }: { className?: string }) {
  return <span className={`inline-block h-2 w-2 rotate-45 rounded-[1px] ${className ?? ''}`} />;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg === 'Insufficient permissions') {
        setError('This account does not have admin access.');
      } else if (msg === 'Invalid credentials') {
        setError('Invalid email or password.');
      } else if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        setError('Cannot reach the API server (is it running on port 3001?).');
      } else {
        setError(msg || 'Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-forest-950 px-4">
      {/* Ambient brand glow backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gold-500/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-forest-600/30 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400/5 blur-3xl" />
      </div>

      {/* Diamond motif row */}
      <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center gap-3 opacity-40">
        <Diamond className="bg-gold-500/50" />
        <Diamond className="bg-gold-500/25" />
        <Diamond className="bg-gold-500/50" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <CreatorPlusMark className="mx-auto mb-4 h-16 w-16 rounded-2xl shadow-lg shadow-black/30" />
          <h1 className="font-display text-2xl font-bold tracking-tight">
            <span className="text-white">Creator</span>
            <span className="text-gold-400">Plus</span>
            <span className="eyebrow ml-3 align-middle text-gold-400">Admin</span>
          </h1>
          <p className="mt-2 text-sm text-forest-300">Sign in to the platform console</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-clay-400/40 bg-clay-500/15 px-3 py-2.5 text-sm text-clay-100">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-forest-100">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-forest-400 transition focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                placeholder="admin@creatormarket.ng"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-forest-100">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-forest-400 transition focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-forest-950 shadow-lg shadow-gold-500/25 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-forest-400">
          Restricted access · authorized administrators only
        </p>
      </div>
    </div>
  );
}
