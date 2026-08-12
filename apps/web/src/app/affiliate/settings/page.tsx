'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useAffiliate } from '@/components/affiliate/affiliate-gate';
import { AffiliateApplicationForm } from '@/components/affiliate/application-form';

export default function AffiliateSettingsPage() {
  const { token } = useAuth();
  const { me, refresh } = useAffiliate();
  const [saved, setSaved] = useState(false);

  if (!me) return null;

  return (
    <div className="max-w-3xl">
      <p className="eyebrow text-gold-600">Settings</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
        Affiliate settings
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Update your promotion details, payout method or referral code. Saving your changes never
        pauses an active account.
      </p>

      {saved && (
        <p className="mt-6 rounded-xl bg-forest-50 px-4 py-3 text-sm font-medium text-forest-800">
          Your changes were saved.
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 sm:p-8">
        <AffiliateApplicationForm
          token={token!}
          mode="update"
          initialValues={{
            applicationMessage: me.applicationMessage ?? '',
            websiteUrl: me.websiteUrl ?? '',
            promotionChannels: (me.promotionChannels ?? []).join(', '),
            socialMediaLinks: (me.socialMediaLinks ?? []).join(', '),
            country: me.country ?? '',
            paymentMethod: me.paymentMethod ?? 'Bank Transfer',
            paymentDetails: me.paymentDetails ?? '',
            code: me.code,
          }}
          onSuccess={async () => {
            setSaved(true);
            await refresh();
            setTimeout(() => setSaved(false), 3000);
          }}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">Account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-ink-400">Referral code</dt>
            <dd className="font-mono font-semibold text-ink-900">{me.code}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-400">Status</dt>
            <dd>
              <span className="rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-medium text-forest-700">
                Active
              </span>
            </dd>
          </div>
          {me.approvedAt && (
            <div className="flex items-center justify-between">
              <dt className="text-ink-400">Approved on</dt>
              <dd className="text-ink-900">
                {new Date(me.approvedAt).toLocaleDateString('en-NG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
