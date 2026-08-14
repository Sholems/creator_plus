'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { CreatorEmptyState } from '@/components/market/creator-empty-state';
import { ImageUpload } from '@/components/market/image-upload';
import { SITE_DOMAIN } from '@/lib/brand';

const VERIFICATION_META: Record<string, { label: string; classes: string }> = {
  APPROVED: { label: 'Verified', classes: 'bg-forest-100 text-forest-700' },
  SUBMITTED: { label: 'Under review', classes: 'bg-gold-100 text-gold-700' },
  UNDER_REVIEW: { label: 'Under review', classes: 'bg-gold-100 text-gold-700' },
  REJECTED: { label: 'Action needed', classes: 'bg-clay-100 text-clay-700' },
  PENDING: { label: 'Not submitted', classes: 'bg-cream-100 text-ink-500' },
};

const SOCIAL_FIELDS = [
  { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/yourhandle' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' },
] as const;

const inputClass =
  'mt-1.5 block w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20';

export default function CreatorStorePage() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [noProfile, setNoProfile] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [verification, setVerification] = useState<any>(null);
  const [identityType, setIdentityType] = useState('National ID Card');
  const [identityNumber, setIdentityNumber] = useState('');
  const [identityDocument, setIdentityDocument] = useState('');
  const [docName, setDocName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    storeName: '',
    slug: '',
    bio: '',
    avatar: '',
    banner: '',
  });
  const [socials, setSocials] = useState<Record<string, string>>({
    x: '',
    instagram: '',
    tiktok: '',
    youtube: '',
  });

  useEffect(() => {
    if (token) {
      loadProfile();
    }
  }, [token]);

  const loadProfile = async () => {
    if (!token) return;
    try {
      const [profile, verificationData] = await Promise.all([
        api.getCreatorProfile(token).catch(() => null),
        api.getCreatorVerification(token).catch(() => null),
      ]);
      if (!profile) {
        setNoProfile(true);
        return;
      }
      setFormData({
        storeName: profile.storeName || '',
        slug: profile.slug || '',
        bio: profile.bio || '',
        avatar: profile.avatar || '',
        banner: profile.banner || '',
      });
      setSocials({
        x: profile.socialLinks?.x || '',
        instagram: profile.socialLinks?.instagram || '',
        tiktok: profile.socialLinks?.tiktok || '',
        youtube: profile.socialLinks?.youtube || '',
      });
      setVerification(verificationData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    const socialLinks: Record<string, string> = Object.fromEntries(
      Object.entries(socials).filter(([, v]) => v.trim() !== ''),
    );

    try {
      await api.updateCreatorProfile(token, {
        storeName: formData.storeName,
        slug: formData.slug,
        bio: formData.bio,
        avatar: formData.avatar.trim() || undefined,
        banner: formData.banner.trim() || undefined,
        socialLinks,
      });
      setSuccess('Store settings updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update store settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    setVerificationMessage(null);
    try {
      const { url } = await api.uploadFile(token, file, 'verification');
      setIdentityDocument(url);
      setDocName(file.name);
    } catch (err: any) {
      setVerificationMessage({ ok: false, text: err.message || 'Upload failed. Try again.' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !identityDocument) return;
    setSubmittingVerification(true);
    setVerificationMessage(null);
    try {
      await api.submitVerification(token, {
        identityType,
        identityNumber,
        identityDocument,
      });
      setVerificationMessage({ ok: true, text: 'Verification submitted. Our team will review it shortly.' });
      setVerification((await api.getCreatorVerification(token)) as any);
    } catch (err: any) {
      setVerificationMessage({ ok: false, text: err.message || 'Could not submit verification' });
    } finally {
      setSubmittingVerification(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-forest-100/60" />
        ))}
      </div>
    );
  }

  const vStatus = verification?.status || 'PENDING';
  const vMeta = VERIFICATION_META[vStatus] || VERIFICATION_META.PENDING;
  const isApproved = verification?.verified || vStatus === 'APPROVED';
  const showVerificationForm = !isApproved;

  return (
    <div>
      <p className="eyebrow text-gold-600">Creator Studio</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink-900">Store Settings</h1>

      {noProfile ? (
        <div className="mt-6">
          <CreatorEmptyState />
        </div>
      ) : (
        <>
          {success && (
            <div className="mt-5 rounded-xl border border-forest-200 bg-forest-50 px-4 py-3 text-sm text-forest-700">
              {success}
            </div>
          )}
          {error && (
            <div className="mt-5 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 max-w-2xl">
            <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
              <h2 className="font-display text-lg font-semibold text-ink-900">Store information</h2>
              <p className="mt-1 text-sm text-ink-500">
                Your public identity on the market — shown on your storefront.
              </p>

              <div className="mt-5 space-y-5">
                <div>
                  <label htmlFor="storeName" className="block text-sm font-semibold text-ink-800">
                    Store name
                  </label>
                  <input
                    type="text"
                    id="storeName"
                    required
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Adaeze Designs"
                  />
                </div>

                <div>
                  <label htmlFor="slug" className="block text-sm font-semibold text-ink-800">
                    Store URL
                  </label>
                  <div className="mt-1.5 flex overflow-hidden rounded-xl border border-ink-200 bg-white focus-within:border-forest-500 focus-within:ring-2 focus-within:ring-forest-500/20">
                    <span className="inline-flex shrink-0 items-center border-r border-ink-100 bg-cream-100 px-3 font-mono text-xs text-ink-500">
                      {SITE_DOMAIN}/creator/
                    </span>
                    <input
                      type="text"
                      id="slug"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="min-w-0 flex-1 px-3 py-2.5 font-mono text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none"
                      placeholder="adaeze-designs"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-semibold text-ink-800">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className={`${inputClass} resize-none`}
                    placeholder="Tell buyers about yourself and your products..."
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
              <h2 className="font-display text-lg font-semibold text-ink-900">Store images</h2>
              <p className="mt-1 text-sm text-ink-500">
                Your logo and cover image make your store stand out.
              </p>

              <div className="mt-5 space-y-6">
                <ImageUpload
                  label="Store logo"
                  hint="Square image, shown on your storefront and next to your products."
                  value={formData.avatar}
                  onChange={(url) => setFormData((f) => ({ ...f, avatar: url }))}
                  aspect="logo"
                />
                <ImageUpload
                  label="Cover image"
                  hint="Wide image (max 5MB) shown across the top of your storefront."
                  value={formData.banner}
                  onChange={(url) => setFormData((f) => ({ ...f, banner: url }))}
                  aspect="banner"
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
              <h2 className="font-display text-lg font-semibold text-ink-900">Social links</h2>
              <p className="mt-1 text-sm text-ink-500">
                Optional — where buyers can find you outside the market.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                      className={inputClass}
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center rounded-full bg-forest-800 px-6 py-2.5 text-sm font-semibold text-cream-50 shadow-sm transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>

          <div className="mt-6 max-w-2xl rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-lg font-semibold text-ink-900">Identity verification</h2>
              <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 eyebrow text-[0.625rem] ${vMeta.classes}`}>
                {vMeta.label}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-500">
              Verify your identity to earn the trust badge on your store and unlock advanced payouts.
            </p>

            {verification?.rejectionReason && (
              <div className="mt-3 rounded-xl border border-clay-200 bg-clay-50 p-3 text-sm text-clay-700">
                <span className="font-semibold">Rejected:</span> {verification.rejectionReason}
              </div>
            )}

            {verificationMessage && (
              <div className={`mt-3 rounded-xl px-3 py-2 text-sm ${verificationMessage.ok ? 'bg-forest-50 text-forest-700' : 'bg-clay-50 text-clay-700'}`}>
                {verificationMessage.text}
              </div>
            )}

            {isApproved ? (
              <div className="mt-4 rounded-xl border border-forest-200 bg-forest-50 p-4 text-sm text-forest-700">
                Your identity is verified{verification?.verifiedAt ? ` (since ${new Date(verification.verifiedAt).toLocaleDateString()})` : ''}.
              </div>
            ) : (
              <form onSubmit={handleSubmitVerification} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="identity-type" className="block text-sm font-semibold text-ink-800">
                    Identity type
                  </label>
                  <select
                    id="identity-type"
                    value={identityType}
                    onChange={(e) => setIdentityType(e.target.value)}
                    className={inputClass}
                  >
                    <option>National ID Card</option>
                    <option>International Passport</option>
                    <option>Driver&apos;s License</option>
                    <option>BVN</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="identity-number" className="block text-sm font-semibold text-ink-800">
                    Identity number
                  </label>
                  <input
                    id="identity-number"
                    required
                    value={identityNumber}
                    onChange={(e) => setIdentityNumber(e.target.value)}
                    placeholder="e.g. NIN 12345678901"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-800">
                    Identity document <span className="font-normal text-ink-400">(photo of your ID)</span>
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex items-center rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition-colors hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploading ? 'Uploading…' : 'Choose file'}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handleDocUpload}
                    />
                    {docName ? (
                      <span className="truncate text-sm text-forest-700">{docName} uploaded</span>
                    ) : (
                      <span className="text-sm text-ink-400">No file selected</span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingVerification || uploading || !identityNumber || !identityDocument}
                  className="inline-flex items-center rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 shadow-sm transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingVerification ? 'Submitting…' : 'Submit verification'}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
