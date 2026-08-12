'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { AffiliateApplicationForm } from '@/components/affiliate/application-form';

export type AffiliateStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'BANNED';

export interface AffiliateMe {
  id: string;
  code: string;
  status: AffiliateStatus;
  applicationMessage?: string | null;
  promotionChannels?: string[];
  websiteUrl?: string | null;
  socialMediaLinks?: string[];
  country?: string | null;
  paymentMethod?: string | null;
  paymentDetails?: string | null;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  totalClicks?: number;
}

interface AffiliateContextValue {
  me: AffiliateMe | null;
  refresh: () => Promise<void>;
}

const AffiliateContext = createContext<AffiliateContextValue>({
  me: null,
  refresh: async () => undefined,
});

export function useAffiliate() {
  return useContext(AffiliateContext);
}

function LoadingScreen() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-sm space-y-4">
        <div className="h-6 w-2/3 animate-pulse rounded bg-cream-200" />
        <div className="h-32 animate-pulse rounded-2xl bg-cream-100" />
      </div>
    </div>
  );
}

function joinList(values?: string[]) {
  return values && values.length > 0 ? values.join(', ') : '';
}

export function AffiliateGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { token, user, isLoading: authLoading } = useAuth();
  const [me, setMe] = useState<AffiliateMe | null>(null);
  const [state, setState] = useState<'loading' | 'guest' | 'none' | 'ready'>('loading');
  const [loadError, setLoadError] = useState('');

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getAffiliateMe(token);
      setMe(data);
      setState('ready');
    } catch {
      setMe(null);
      setState('none');
    }
  }, [token]);

  useEffect(() => {
    if (authLoading) {
      setState('loading');
      return;
    }
    if (!token) {
      setState('guest');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getAffiliateMe(token);
        if (cancelled) return;
        setMe(data);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setMe(null);
        // 404 = no application yet; anything else surfaces as an error.
        if ((err as any)?.status && (err as any).status !== 404) {
          setLoadError(err instanceof Error ? err.message : 'Could not load your affiliate account');
        }
        setState('none');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, token]);

  useEffect(() => {
    if (state === 'guest') router.replace('/earn');
  }, [state, router]);

  if (state === 'guest') return <LoadingScreen />;
  if (state === 'loading') return <LoadingScreen />;

  if (loadError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md rounded-2xl border border-ink-100 bg-white p-8 text-center">
          <h2 className="font-display text-xl font-bold text-ink-900">Something went wrong</h2>
          <p className="mt-2 text-sm text-ink-500">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-forest-800 px-6 py-2.5 text-sm font-semibold text-cream-50 hover:bg-forest-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (state === 'none' || !me) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-8">
          <p className="eyebrow text-gold-600">Join the program</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-900">
            Apply to become an affiliate
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-500">
            Once approved you get a personal referral code, can generate tracked links for any
            approved product, and earn the creator-set reward (up to 50%) on every referred sale.
          </p>
          <div className="mt-6">
            <AffiliateApplicationForm
              token={token!}
              onSuccess={() => refresh()}
            />
          </div>
        </div>
      </div>
    );
  }

  if (me.status === 'PENDING') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-3xl border border-gold-400/40 bg-white p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-100">
            <svg className="h-7 w-7 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">
            Application under review
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Thanks for applying! Our team is reviewing your application. You&apos;ll get a
            notification the moment it&apos;s approved — usually within a day.
          </p>
        </div>
      </div>
    );
  }

  if (me.status === 'SUSPENDED' || me.status === 'BANNED') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-3xl border border-clay-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-clay-50">
            <svg className="h-7 w-7 text-clay-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">
            Affiliate account {me.status === 'SUSPENDED' ? 'suspended' : 'disabled'}
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            {me.status === 'SUSPENDED'
              ? 'Your affiliate account is currently suspended. Contact support if you have questions.'
              : 'This affiliate account is no longer active. Contact support if you believe this is a mistake.'}
          </p>
        </div>
      </div>
    );
  }

  if (me.status === 'REJECTED') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-8">
          <p className="eyebrow text-gold-600">Re-apply</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-900">
            Your application was not approved
          </h1>
          {me.rejectionReason && (
            <p className="mt-3 rounded-lg bg-clay-50 px-4 py-2.5 text-sm text-clay-700">
              {me.rejectionReason}
            </p>
          )}
          <p className="mt-3 max-w-2xl text-sm text-ink-500">
            Update your details below and re-submit. Saving your changes sends the application
            back for review.
          </p>
          <div className="mt-6">
            <AffiliateApplicationForm
              token={token!}
              mode="update"
              initialValues={{
                applicationMessage: me.applicationMessage ?? '',
                websiteUrl: me.websiteUrl ?? '',
                promotionChannels: joinList(me.promotionChannels),
                socialMediaLinks: joinList(me.socialMediaLinks),
                country: me.country ?? '',
                paymentMethod: me.paymentMethod ?? 'Bank Transfer',
                paymentDetails: me.paymentDetails ?? '',
                code: me.code,
              }}
              onSuccess={() => refresh()}
              ctaLabel="Re-submit application"
            />
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE
  return (
    <AffiliateContext.Provider value={{ me, refresh }}>
      <div className="border-b border-gold-400/40 bg-gradient-to-r from-forest-900 to-forest-950 text-cream-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <p className="text-sm">
            <span className="font-semibold text-gold-300">{user?.displayName || 'Affiliate'}</span>
            <span className="mx-2 text-cream-100/40">·</span>
            <span className="text-cream-100/80">Your referral code</span>
            <code className="ml-2 rounded-md border border-gold-400/40 bg-gold-400/10 px-2 py-0.5 font-mono text-xs font-semibold text-gold-300">
              {me.code}
            </code>
          </p>
          <Link href="/affiliate/marketplace" className="text-sm font-medium text-gold-300 hover:text-gold-200">
            Browse products to promote →
          </Link>
        </div>
      </div>
      {children}
    </AffiliateContext.Provider>
  );
}
