'use client';

import { useEffect, useState } from 'react';
import { cn } from '@creatormarket/ui';
import { api } from '@/lib/api';

const PROVIDER_META: Record<
  string,
  { name: string; tag: string; description: string }
> = {
  paystack: {
    name: 'Paystack',
    tag: '🇳🇬 Best for Nigeria',
    description: 'Pay with any Nigerian card, bank account or QR.',
  },
  flutterwave: {
    name: 'Flutterwave',
    tag: '🌍 Pan-African',
    description: 'Cards, bank transfer, USSD and mobile money across Africa.',
  },
  stripe: {
    name: 'Stripe',
    tag: '🌐 International',
    description: 'For buyers outside Africa using international cards.',
  },
};

const FALLBACK = ['paystack', 'flutterwave', 'stripe'];

export function PaymentProviderPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (provider: string) => void;
}) {
  const [available, setAvailable] = useState<string[]>(FALLBACK);

  useEffect(() => {
    api
      .getPaymentProviders()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) setAvailable(list);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-3">
      <p className="eyebrow text-ink-400">Pay with</p>
      <div className="grid gap-2.5">
        {available.map((key) => {
          const meta = PROVIDER_META[key] || { name: key, tag: '', description: '' };
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
                selected
                  ? 'border-gold-500 bg-gold-50 shadow-sm ring-1 ring-gold-500'
                  : 'border-ink-100 bg-white hover:border-forest-300',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                  selected ? 'border-gold-500' : 'border-ink-200',
                )}
              >
                {selected && <span className="h-2.5 w-2.5 rounded-full bg-gold-500" />}
              </span>
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-display font-semibold text-ink-900">{meta.name}</span>
                  {meta.tag && (
                    <span className="rounded-full bg-forest-100 px-2 py-0.5 eyebrow text-[0.5625rem] text-forest-700">
                      {meta.tag}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-ink-500">{meta.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
