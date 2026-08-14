'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { AdinkraMark, AdinkraField } from '@/components/brand/adinkra';
import { ImageUpload } from '@/components/market/image-upload';
import { SITE_DOMAIN, SITE_NAME } from '@/lib/brand';
import { cn } from '@creatormarket/ui';

const STEPS = [
  { n: 1, title: 'Store identity', desc: 'Name your store & claim your URL' },
  { n: 2, title: 'Your profile', desc: 'Bio, cover & social links' },
  { n: 3, title: 'Review & launch', desc: 'Confirm and go live' },
] as const;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SOCIAL_FIELDS = [
  { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/yourhandle' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' },
] as const;

export default function SellPage() {
  const { token, register, refresh } = useAuth();

  const [step, setStep] = useState(0);
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [banner, setBanner] = useState('');
  const [socials, setSocials] = useState<Record<string, string>>({
    x: '',
    instagram: '',
    tiktok: '',
    youtube: '',
  });
  const [account, setAccount] = useState({ displayName: '', email: '', password: '' });
  const [accountError, setAccountError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegisterAndLaunch = async () => {
    setAccountError('');
    if (!account.email || !account.password) {
      setAccountError('Enter your email and password to create your account.');
      return;
    }
    if (account.password.length < 8) {
      setAccountError('Password must be at least 8 characters.');
      return;
    }
    setIsRegistering(true);
    try {
      const res = await register(account.email, account.password, account.displayName || undefined);
      await launch(res.accessToken);
    } catch (err: any) {
      setAccountError(err.message || 'Failed to create your account. Please try again.');
      setIsRegistering(false);
    }
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleNameChange = (value: string) => {
    setStoreName(value);
    setSlug(generateSlug(value));
  };

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const profile = await api.getCreatorProfile(token);
        setHasProfile(true);
        setStoreName(profile.storeName || '');
        setSlug(profile.slug || '');
        setBio(profile.bio || '');
        setAvatar(profile.avatar || '');
        setBanner(profile.banner || '');
        setSocials({
          x: profile.socialLinks?.x || '',
          instagram: profile.socialLinks?.instagram || '',
          tiktok: profile.socialLinks?.tiktok || '',
          youtube: profile.socialLinks?.youtube || '',
        });
      } catch {
        setHasProfile(false);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [token]);

  const slugValid = SLUG_RE.test(slug);
  const storeValid = storeName.trim().length >= 3 && slugValid;
  const socialLinks: Record<string, string> = Object.fromEntries(
    Object.entries(socials).filter(([, v]) => v.trim() !== ''),
  );

  const canContinue = step === 0 ? storeValid : true;

  const goNext = () => {
    if (step < STEPS.length - 1 && canContinue) setStep(step + 1);
  };

  const launch = async (authToken: string) => {
    setIsSaving(true);
    setError('');
    try {
      if (hasProfile) {
        await api.updateCreatorProfile(authToken, {
          storeName: storeName.trim(),
          slug,
          bio: bio.trim(),
          avatar: avatar.trim() || undefined,
          banner: banner.trim() || undefined,
          socialLinks,
        });
      } else {
        await api.applyCreator(authToken, { storeName: storeName.trim(), slug });
        await api.updateCreatorProfile(authToken, {
          bio: bio.trim(),
          avatar: avatar.trim() || undefined,
          banner: banner.trim() || undefined,
          socialLinks,
        });
      }
      setSuccess(true);
      void refresh().catch(() => undefined);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setIsSaving(false);
    }
  };

  const handleLaunch = () => {
    if (token) launch(token);
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4">
        <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-forest-900 p-10 text-center text-cream-50 sm:p-12">
          <AdinkraField patternId="adinkra-sell-success" className="text-gold-400/15" />
          <div className="pointer-events-none absolute inset-0 bg-forest-900/60" />
          <div className="relative">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold-400/20 ring-2 ring-gold-400/60">
              <svg className="h-10 w-10 text-gold-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="eyebrow mt-8 text-gold-300">Welcome to the market</p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {storeName} is live!
            </h1>
            <p className="mt-4 text-cream-100/80">
              Your store is ready for the world. Upload your first product to start
              selling — you keep <span className="font-semibold text-gold-300">90%</span>{' '}
              of every sale, paid out in naira.
            </p>
            <div className="mt-9 flex flex-col gap-3">
              <Link
                href="/creator/products/new"
                className="inline-flex items-center justify-center rounded-full bg-gold-400 px-7 py-3.5 font-semibold text-forest-950 shadow-[0_8px_24px_rgba(232,180,58,0.35)] transition-colors hover:bg-gold-300"
              >
                Add your first product <span className="ml-1">→</span>
              </Link>
              <Link
                href="/creator"
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-7 py-3.5 font-semibold text-cream-50 transition-colors hover:border-gold-300 hover:text-gold-300"
              >
                Go to Creator Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-forest-100/60" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 flex items-center gap-3">
        <AdinkraMark className="h-10 w-10 text-gold-500" />
        <div>
          <p className="eyebrow text-gold-600">{SITE_NAME} · Creator onboarding</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Set up your store
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[280px_1fr]">
        {/* Stepper rail */}
        <aside className="min-w-0 lg:border-r lg:border-ink-100 lg:pr-8">
          <ol className="space-y-1">
            {STEPS.map((s, i) => {
              const state = i < step ? 'done' : i === step ? 'current' : 'todo';
              return (
                <li key={s.n}>
                  <button
                    type="button"
                    onClick={() => i < step && setStep(i)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                      state === 'current' ? 'bg-forest-50' : 'hover:bg-cream-100/70',
                      i < step ? 'cursor-pointer' : 'cursor-default',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold transition-colors',
                        state === 'done' && 'bg-forest-800 text-cream-50',
                        state === 'current' && 'bg-gold-400 text-forest-950 ring-4 ring-gold-400/25',
                        state === 'todo' && 'border border-ink-200 bg-white text-ink-400',
                      )}
                    >
                      {state === 'done' ? '✓' : s.n}
                    </span>
                    <span>
                      <span
                        className={cn(
                          'block text-sm font-semibold',
                          state === 'current' ? 'text-forest-800' : state === 'done' ? 'text-ink-900' : 'text-ink-400',
                        )}
                      >
                        {s.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-400">{s.desc}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Perks */}
          <div className="mt-8 hidden rounded-2xl border border-forest-100 bg-forest-50 p-5 lg:block">
            <p className="eyebrow text-forest-600">Why {SITE_NAME}?</p>
            <ul className="mt-4 space-y-3 text-sm text-ink-700">
              {[
                ['90%', 'of every sale stays with you'],
                ['₦', 'paid out to any Nigerian bank'],
                ['⚡', 'moderation & instant downloads'],
              ].map(([v, t]) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="font-mono text-base font-bold text-forest-700">{v}</span>
                  <span className="leading-snug">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0">
          <div className="surface-card p-6 sm:p-8">
            {step === 0 && (
              <section>
                <p className="eyebrow text-gold-600">Step {STEPS[0].n} of {STEPS.length}</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-ink-900">Name your store</h2>
                <p className="mt-2 text-sm text-ink-500">
                  This is your public identity on the market. You can change it later.
                </p>

                <div className="mt-7 space-y-6">
                  <div>
                    <label htmlFor="storeName" className="block text-sm font-semibold text-ink-800">
                      Store name
                    </label>
                    <input
                      type="text"
                      id="storeName"
                      required
                      value={storeName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-300 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
                      placeholder="e.g. Adaeze Designs"
                    />
                    {storeName && storeName.trim().length < 3 && (
                      <p className="mt-1.5 text-xs text-clay-600">Store name must be at least 3 characters.</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="slug" className="block text-sm font-semibold text-ink-800">
                      Store URL
                    </label>
                    <div className="mt-2 flex overflow-hidden rounded-xl border border-ink-200 bg-white focus-within:border-forest-500 focus-within:ring-2 focus-within:ring-forest-500/20">
                      <span className="inline-flex shrink-0 items-center border-r border-ink-100 bg-cream-100 px-3 font-mono text-xs text-ink-500">
                        {SITE_DOMAIN}/creator/
                      </span>
                      <input
                        type="text"
                        id="slug"
                        required
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="min-w-0 flex-1 px-3 py-3 font-mono text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none"
                        placeholder="adaeze-designs"
                      />
                    </div>
                    {slug && !slugValid && (
                      <p className="mt-1.5 text-xs text-clay-600">
                        Lowercase letters, numbers and hyphens only (e.g. adaeze-designs).
                      </p>
                    )}
                    {slugValid && slug && (
                      <p className="mt-1.5 text-xs text-forest-600">✓ {slug} is available.</p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {step === 1 && (
              <section>
                <p className="eyebrow text-gold-600">Step {STEPS[1].n} of {STEPS.length}</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-ink-900">Tell buyers about you</h2>
                <p className="mt-2 text-sm text-ink-500">
                  A little context builds trust. All fields are optional.
                </p>

                <div className="mt-7 space-y-6">
                  <div>
                    <label htmlFor="bio" className="block text-sm font-semibold text-ink-800">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      rows={4}
                      maxLength={500}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="mt-2 w-full resize-none rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-300 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
                      placeholder="What do you make? Who is it for?"
                    />
                    <p className="mt-1.5 text-right font-mono text-xs text-ink-400">{bio.length}/500</p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <ImageUpload
                      label="Store logo"
                      hint="Square image, shown on your storefront and next to your products."
                      value={avatar}
                      onChange={setAvatar}
                      aspect="logo"
                    />
                    <ImageUpload
                      label="Cover image"
                      hint="Wide image (max 5MB) shown across the top of your storefront."
                      value={banner}
                      onChange={setBanner}
                      aspect="banner"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-ink-800">Social links</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      {SOCIAL_FIELDS.map((f) => (
                        <div key={f.key}>
                          <label htmlFor={`social-${f.key}`} className="block text-xs font-medium text-ink-500">
                            {f.label}
                          </label>
                          <input
                            type="url"
                            id={`social-${f.key}`}
                            value={socials[f.key]}
                            onChange={(e) => setSocials({ ...socials, [f.key]: e.target.value })}
                            className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
                            placeholder={f.placeholder}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section>
                <p className="eyebrow text-gold-600">Step {STEPS[2].n} of {STEPS.length}</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-ink-900">Ready to launch?</h2>
                <p className="mt-2 text-sm text-ink-500">
                  Review your store before it goes live.
                </p>

                <dl className="mt-7 space-y-5">
                  <div className="flex items-start justify-between gap-6 border-b border-ink-100 pb-4">
                    <dt className="text-sm font-medium text-ink-500">Store name</dt>
                    <dd className="font-display text-base font-semibold text-ink-900">{storeName}</dd>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-ink-100 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <dt className="shrink-0 text-sm font-medium text-ink-500">Store URL</dt>
                    <dd className="min-w-0 break-all text-right font-mono text-sm text-forest-700">{SITE_DOMAIN}/creator/{slug}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-6 border-b border-ink-100 pb-4">
                    <dt className="text-sm font-medium text-ink-500">Logo</dt>
                    <dd className="flex justify-end gap-2">
                      {avatar ? (
                        <img src={avatar} alt="Store logo" className="h-12 w-12 rounded-full object-cover ring-2 ring-gold-400/40" />
                      ) : (
                        <span className="text-sm text-ink-400">None</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-ink-100 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <dt className="shrink-0 text-sm font-medium text-ink-500">Cover</dt>
                    <dd className="min-w-0 sm:max-w-xs">
                      {banner ? (
                        <img src={banner} alt="Store cover" className="h-20 w-full rounded-lg object-cover" />
                      ) : (
                        <span className="block text-right text-sm text-ink-400">None</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-6 border-b border-ink-100 pb-4">
                    <dt className="text-sm font-medium text-ink-500">Bio</dt>
                    <dd className="max-w-sm text-right text-sm text-ink-600">{bio || '—'}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-6 border-b border-ink-100 pb-4">
                    <dt className="text-sm font-medium text-ink-500">Socials</dt>
                    <dd className="flex flex-wrap justify-end gap-2">
                      {Object.keys(socialLinks).length === 0 ? (
                        <span className="text-sm text-ink-400">None</span>
                      ) : (
                        Object.keys(socialLinks).map((k) => (
                          <span key={k} className="rounded-full bg-cream-100 px-2.5 py-1 font-mono text-xs text-ink-600">
                            {k}
                          </span>
                        ))
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="mt-7 rounded-2xl border border-forest-100 bg-forest-50 p-5">
                  <p className="eyebrow text-forest-600">What happens next</p>
                  <ul className="mt-3 space-y-2 text-sm text-ink-700">
                    <li>· Your products are reviewed before going live</li>
                    <li>· You keep 90% of every sale</li>
                    <li>· Payouts go to any Nigerian bank in naira</li>
                  </ul>
                </div>

                {!token && (
                  <div className="mt-7 rounded-2xl border border-ink-100 bg-cream-100/70 p-6">
                    <p className="eyebrow text-gold-600">One last thing</p>
                    <h3 className="mt-2 font-display text-lg font-bold text-ink-900">
                      Create your free account
                    </h3>
                    <p className="mt-1 text-sm text-ink-500">
                      You need an account to launch your store. It takes less than a minute — we&apos;ll keep your store details right here.
                    </p>

                    <div className="mt-5 space-y-4">
                      <div>
                        <label htmlFor="account-name" className="block text-sm font-semibold text-ink-800">
                          Your name
                        </label>
                        <input
                          type="text"
                          id="account-name"
                          value={account.displayName}
                          onChange={(e) => setAccount({ ...account, displayName: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
                          placeholder="e.g. Adaeze Okafor"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="account-email" className="block text-sm font-semibold text-ink-800">
                            Email
                          </label>
                          <input
                            type="email"
                            id="account-email"
                            required
                            value={account.email}
                            onChange={(e) => setAccount({ ...account, email: e.target.value })}
                            className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
                            placeholder="you@example.com"
                          />
                        </div>
                        <div>
                          <label htmlFor="account-password" className="block text-sm font-semibold text-ink-800">
                            Password
                          </label>
                          <input
                            type="password"
                            id="account-password"
                            required
                            value={account.password}
                            onChange={(e) => setAccount({ ...account, password: e.target.value })}
                            className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
                            placeholder="Min. 8 characters"
                          />
                        </div>
                      </div>
                      {accountError && (
                        <p className="text-sm text-clay-600">{accountError}</p>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-700">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Nav */}
            <div className="mt-9 flex items-center justify-between gap-4 border-t border-ink-100 pt-6">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="inline-flex items-center rounded-full border border-ink-200 px-6 py-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-cream-100"
                >
                  ← Back
                </button>
              ) : (
                <span />
              )}

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canContinue}
                  className="inline-flex items-center rounded-full bg-forest-800 px-7 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue →
                </button>
              ) : token ? (
                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={isSaving}
                  className="inline-flex items-center rounded-full bg-gold-400 px-7 py-3 text-sm font-semibold text-forest-950 shadow-[0_8px_24px_rgba(232,180,58,0.35)] transition-colors hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSaving ? 'Launching…' : hasProfile ? 'Save changes' : 'Launch my store'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRegisterAndLaunch}
                  disabled={isRegistering}
                  className="inline-flex items-center rounded-full bg-gold-400 px-7 py-3 text-sm font-semibold text-forest-950 shadow-[0_8px_24px_rgba(232,180,58,0.35)] transition-colors hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isRegistering ? 'Creating account…' : 'Create account & launch store'}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
