'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

type Step = 'idle' | 'scan' | 'verify' | 'enabled' | 'disable';

export default function AdminSecurityPage() {
  const { token } = useAuth();
  const [step, setStep] = useState<Step>('idle');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState('');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.getTwoFactorStatus(token);
      setEnabled(res.enabled);
      setStep(res.enabled ? 'enabled' : 'idle');
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const startSetup = async () => {
    if (!token) return;
    setError('');
    setSaving(true);
    try {
      const res = await api.setupTwoFactor(token);
      setSecret(res.secret);
      setOtpauthUri(res.otpauthUri);
      setStep('scan');
    } catch (err: any) {
      setError(err.message || 'Failed to start 2FA setup');
    } finally {
      setSaving(false);
    }
  };

  const confirmEnable = async () => {
    if (!token || code.length !== 6) return;
    setError('');
    setSaving(true);
    try {
      const res = await api.enableTwoFactor(token, code);
      setBackupCodes(res.backupCodes);
      setEnabled(true);
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!token || !disablePassword) return;
    setError('');
    setSaving(true);
    try {
      await api.disableTwoFactor(token, disablePassword);
      setEnabled(false);
      setStep('idle');
      setDisablePassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to disable 2FA. Check your password.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <p className="eyebrow text-gold-600">Security</p>
        <h1 className="page-title mt-1">Two-Factor Authentication</h1>
        <div className="mt-6 max-w-lg space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="surface-card h-40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow text-gold-600">Security</p>
      <h1 className="page-title mt-1">Two-Factor Authentication</h1>
      <p className="mt-2 max-w-lg text-sm text-ink-500">
        Add an extra layer of security to your admin account by requiring a verification code from your authenticator app.
      </p>

      {error && (
        <div className="mt-6 max-w-lg rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-700">
          {error}
        </div>
      )}

      <div className="mt-6 max-w-lg space-y-6">
        {/* ─── Step: Not enabled ─── */}
        {step === 'idle' && (
          <div className="surface-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-100">
                <svg className="h-5 w-5 text-forest-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink-900">Not enabled</h2>
                <p className="text-xs text-ink-500">Your admin account is protected by password only.</p>
              </div>
            </div>
            <button
              onClick={startSetup}
              disabled={saving}
              className="btn btn-primary btn-md"
            >
              {saving ? 'Setting up...' : 'Enable 2FA'}
            </button>
          </div>
        )}

        {/* ─── Step: Scan QR ─── */}
        {step === 'scan' && (
          <div className="surface-card p-6">
            <h2 className="text-base font-semibold text-ink-900 mb-2">
              1. Scan this QR code
            </h2>
            <p className="text-sm text-ink-500 mb-4">
              Open your authenticator app (Google Authenticator, Authy, etc.) and scan this code.
            </p>

            <div className="flex justify-center mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`}
                alt="2FA QR Code"
                className="rounded-xl border border-ink-100"
                width={200}
                height={200}
              />
            </div>

            <div className="rounded-xl bg-cream-100 p-3 mb-4">
              <p className="text-[0.625rem] font-semibold uppercase tracking-widest text-ink-400 mb-1">
                Manual entry key
              </p>
              <code className="block font-mono text-sm font-medium text-ink-900 break-all">
                {secret}
              </code>
            </div>

            <h2 className="text-base font-semibold text-ink-900 mb-2 mt-6">
              2. Enter verification code
            </h2>
            <p className="text-sm text-ink-500 mb-3">
              Enter the 6-digit code from your authenticator app to confirm.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="input w-40 text-center font-mono text-lg tracking-[0.3em]"
              placeholder="000000"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={confirmEnable}
                disabled={saving || code.length !== 6}
                className="btn btn-primary btn-md"
              >
                {saving ? 'Verifying...' : 'Verify & Enable'}
              </button>
              <button
                onClick={() => { setStep('idle'); setCode(''); setError(''); }}
                className="btn btn-secondary btn-md"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ─── Step: Backup codes shown ─── */}
        {step === 'verify' && (
          <div className="surface-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="h-5 w-5 text-forest-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-base font-semibold text-ink-900">2FA Enabled!</h2>
            </div>
            <p className="text-sm text-ink-500 mb-4">
              Save these backup codes in a safe place. Each code can only be used once if you lose access to your authenticator app.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {backupCodes.map((c) => (
                <code key={c} className="rounded-lg bg-cream-100 px-3 py-2 text-center font-mono text-sm font-medium text-ink-900">
                  {c}
                </code>
              ))}
            </div>
            <button
              onClick={() => setStep('enabled')}
              className="btn btn-primary btn-md"
            >
              Done
            </button>
          </div>
        )}

        {/* ─── Step: Enabled ─── */}
        {step === 'enabled' && (
          <>
            <div className="surface-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-100">
                  <svg className="h-5 w-5 text-forest-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-ink-900">2FA is active</h2>
                  <p className="text-xs text-ink-500">Your admin account requires a verification code on every login.</p>
                </div>
              </div>
            </div>

            <div className="surface-card p-6">
              <h3 className="text-base font-semibold text-ink-900 mb-2">Disable 2FA</h3>
              <p className="text-sm text-ink-500 mb-4">
                Enter your password to confirm disabling two-factor authentication.
              </p>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="input"
                placeholder="Your password"
              />
              <button
                onClick={handleDisable}
                disabled={saving || !disablePassword}
                className="btn btn-danger btn-md mt-3"
              >
                {saving ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
