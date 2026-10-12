'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface MembershipState {
  active: boolean;
  subscription: {
    status: string;
    interval: string;
    currency: string;
    amount: number;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default function AccountOverviewPage() {
  const { token, user } = useAuth();
  const [membership, setMembership] = useState<MembershipState | null>(null);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resendMessage, setResendMessage] = useState('');

  const unverified = user && !user.emailVerified;

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getMyMembership(token).catch(() => null),
      api.getMyCourseCertificates(token).catch(() => []),
    ])
      .then(([m, certs]) => {
        setMembership(m);
        setCertificates(Array.isArray(certs) ? certs : []);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendMessage('');
    try {
      await api.resendVerification(user.email);
      setResendMessage('A fresh verification link is on its way.');
    } catch (err: any) {
      setResendMessage(err?.message || 'Could not resend the link.');
    }
  };

  const sub = membership?.subscription;
  const isPro = !!membership?.active;

  return (
    <div>
      <p className="eyebrow text-gold-600">My account</p>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
        Welcome back{user?.displayName ? `, ${user.displayName}` : ''}
      </h1>

      {unverified && (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-gold-200 bg-gold-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-sm font-semibold text-ink-900">Verify your email address</p>
            <p className="mt-0.5 text-sm text-ink-600">
              Confirm your email to fully activate your account and receive community updates.
            </p>
            {resendMessage && <p className="mt-1 text-sm font-medium text-forest-700">{resendMessage}</p>}
          </div>
          <button
            onClick={handleResendVerification}
            className="shrink-0 rounded-full border border-forest-300 bg-white px-4 py-2 text-xs font-semibold text-forest-800 transition hover:bg-cream-100"
          >
            Resend email
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Membership */}
        <div className="surface-card p-6">
          <p className="eyebrow text-ink-400">Membership</p>
          {isLoading ? (
            <div className="mt-3 h-10 animate-pulse rounded-xl bg-cream-100" />
          ) : (
            <>
              <p className="mt-2 font-display text-2xl font-bold text-forest-900">
                {isPro ? 'Pro Member' : 'Free Member'}
              </p>
              {isPro && sub ? (
                <p className="mt-1 text-sm text-ink-600">
                  {formatAmount(sub.amount, sub.currency)} / {sub.interval.toLowerCase()} ·{' '}
                  {sub.cancelAtPeriodEnd ? 'ends' : 'renews'} {formatDate(sub.currentPeriodEnd)}
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-600">
                  Unlock every course, certificates, live events and full QR Studio.
                </p>
              )}
              <Link
                href={'/community/join' as Route}
                className="mt-4 inline-block rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-forest-700"
              >
                {isPro ? 'Manage membership' : 'Upgrade to Pro'}
              </Link>
            </>
          )}
        </div>

        {/* QR Studio */}
        <div className="surface-card p-6">
          <p className="eyebrow text-ink-400">QR Studio</p>
          <p className="mt-2 font-display text-2xl font-bold text-forest-900">
            {isPro ? 'Full access' : 'Free plan'}
          </p>
          <p className="mt-1 text-sm text-ink-600">
            {isPro ? 'Unlimited campaigns, all content types and the designer.' : '1 active campaign, no file uploads.'}
          </p>
          <Link
            href={'/creator/qr-studio' as Route}
            className="mt-4 inline-block text-sm font-semibold text-forest-700 hover:text-forest-600"
          >
            Open QR Studio →
          </Link>
        </div>
      </div>

      {/* Certificates */}
      <div className="surface-card mt-6 p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">My certificates</h2>
        {isLoading ? (
          <div className="mt-4 h-12 animate-pulse rounded-xl bg-cream-100" />
        ) : certificates.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-ink-200 p-8 text-center">
            <p className="text-sm text-ink-500">Complete a course to earn your first certificate.</p>
            <Link
              href={'/community/courses' as Route}
              className="mt-2 inline-block text-sm font-medium text-forest-700 hover:underline"
            >
              Browse courses →
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-ink-100">
            {certificates.map((cert) => (
              <li key={cert.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {cert.course?.title || 'Course certificate'}
                  </p>
                  {cert.issuedAt && <p className="text-xs text-ink-500">Issued {formatDate(cert.issuedAt)}</p>}
                </div>
                <Link
                  href={`/community/certificate/${cert.verificationId}` as Route}
                  className="shrink-0 text-sm font-semibold text-forest-700 hover:text-forest-600"
                >
                  View →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
