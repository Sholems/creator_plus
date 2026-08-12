'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { CreatorEmptyState } from '@/components/market/creator-empty-state';

const VERIFICATION_META: Record<string, { label: string; classes: string }> = {
  APPROVED: { label: 'Verified', classes: 'bg-green-100 text-green-700' },
  SUBMITTED: { label: 'Under review', classes: 'bg-yellow-100 text-yellow-700' },
  UNDER_REVIEW: { label: 'Under review', classes: 'bg-yellow-100 text-yellow-700' },
  REJECTED: { label: 'Action needed', classes: 'bg-red-100 text-red-700' },
  PENDING: { label: 'Not submitted', classes: 'bg-gray-100 text-gray-600' },
};

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

    try {
      await api.updateCreatorProfile(token, {
        storeName: formData.storeName,
        slug: formData.slug,
        bio: formData.bio,
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  const vStatus = verification?.status || 'PENDING';
  const vMeta = VERIFICATION_META[vStatus] || VERIFICATION_META.PENDING;
  const isApproved = verification?.verified || vStatus === 'APPROVED';
  const showVerificationForm = !isApproved;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Store Settings</h1>

      {noProfile ? (
        <CreatorEmptyState />
      ) : (
        <>
          {success && (
            <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-700">{success}</div>
          )}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Store Information</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">
                Store Name
              </label>
              <input
                type="text"
                id="storeName"
                required
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your store name"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                Store URL
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  creatormarket.com/creator/
                </span>
                <input
                  type="text"
                  id="slug"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="your-store-name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                Bio
              </label>
              <textarea
                id="bio"
                rows={4}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell buyers about yourself and your products..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <div className="max-w-2xl mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Identity Verification</h2>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${vMeta.classes}`}>
            {vMeta.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Verify your identity to earn the trust badge on your store and unlock advanced payouts.
        </p>

        {verification?.rejectionReason && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <span className="font-semibold">Rejected:</span> {verification.rejectionReason}
          </div>
        )}

        {verificationMessage && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${verificationMessage.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {verificationMessage.text}
          </div>
        )}

        {isApproved ? (
          <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-800">
            Your identity is verified{verification?.verifiedAt ? ` (since ${new Date(verification.verifiedAt).toLocaleDateString()})` : ''}.
          </div>
        ) : (
          <form onSubmit={handleSubmitVerification} className="mt-4 space-y-4">
            <div>
              <label htmlFor="identity-type" className="block text-sm font-medium text-gray-700">
                Identity type
              </label>
              <select
                id="identity-type"
                value={identityType}
                onChange={(e) => setIdentityType(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option>National ID Card</option>
                <option>International Passport</option>
                <option>Driver&apos;s License</option>
                <option>BVN</option>
              </select>
            </div>

            <div>
              <label htmlFor="identity-number" className="block text-sm font-medium text-gray-700">
                Identity number
              </label>
              <input
                id="identity-number"
                required
                value={identityNumber}
                onChange={(e) => setIdentityNumber(e.target.value)}
                placeholder="e.g. NIN 12345678901"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Identity document <span className="text-gray-400">(photo of your ID)</span>
              </label>
              <div className="mt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
                  <span className="truncate text-sm text-green-700">{docName} uploaded</span>
                ) : (
                  <span className="text-sm text-gray-400">No file selected</span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingVerification || uploading || !identityNumber || !identityDocument}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
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
