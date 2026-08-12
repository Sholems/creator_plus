'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function SettingsPage() {
  const { token, user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState<any>(null);
  const [creditBalance, setCreditBalance] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    bio: '',
  });

  useEffect(() => {
    if (token && !authLoading) {
      loadData();
    }
  }, [token, authLoading]);

  const loadData = async () => {
    if (!token) return;
    try {
      const [sub, credits] = await Promise.all([
        api.getSubscription(token),
        api.getCreditBalance(token),
      ]);
      setSubscription(sub);
      setCreditBalance(credits);

      if (user) {
        setProfileForm({
          displayName: user.displayName || '',
          bio: '',
        });
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.updateProfile(token, {
        displayName: profileForm.displayName,
        bio: profileForm.bio,
      });
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="h-5 w-1/4 rounded bg-gray-200 animate-pulse mb-4" />
              <div className="h-4 w-1/3 rounded bg-gray-100 animate-pulse mb-2" />
              <div className="h-4 w-1/2 rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-700">{success}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Profile Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
            <p className="text-xs text-gray-500">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Display Name</label>
            <input
              type="text"
              value={profileForm.displayName}
              onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Your display name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bio</label>
            <textarea
              rows={3}
              value={profileForm.bio}
              onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Tell us about yourself..."
            />
          </div>
          <button
            onClick={handleProfileSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Plan</p>
            <p className="text-lg font-medium text-gray-900">{subscription?.tier || 'Free'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              subscription?.status === 'active' ? 'bg-green-100 text-green-700'
              : subscription?.status === 'cancelled' ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700'
            }`}>
              {subscription?.status || 'Free'}
            </span>
          </div>
          {subscription?.currentPeriodEnd && (
            <div>
              <p className="text-sm text-gray-500">Renews</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
        <div className="mt-4">
          <Link href="/pricing" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {subscription?.tier && subscription.tier !== 'free' ? 'Change Plan' : 'Upgrade'}
          </Link>
        </div>
      </div>

      {/* Credits */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Credit Balance</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">
            {creditBalance ? creditBalance.totalCredits - creditBalance.usedCredits : 0}
          </span>
          <span className="text-sm text-gray-500">credits remaining</span>
        </div>
        <div className="mt-4">
          <Link href="/pricing" className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Purchase Credits
          </Link>
        </div>
      </div>
    </div>
  );
}
