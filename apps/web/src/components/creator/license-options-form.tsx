'use client';

import { useState } from 'react';

interface LicenseOptionsFormProps {
  enabled: boolean;
  maxActivations: number;
  /** null = lifetime license; a positive number = validity in days. */
  validityDays: number | null;
  onChange: (data: {
    licenseKeysEnabled: boolean;
    licenseMaxActivations: number;
    licenseValidityDays: number | null;
  }) => void;
}

export function LicenseOptionsForm({
  enabled,
  maxActivations,
  validityDays,
  onChange,
}: LicenseOptionsFormProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [devices, setDevices] = useState(maxActivations || 2);
  const [mode, setMode] = useState<'lifetime' | 'days'>(validityDays ? 'days' : 'lifetime');
  const [days, setDays] = useState(validityDays || 365);

  const emit = (next: Partial<{ enabled: boolean; devices: number; mode: 'lifetime' | 'days'; days: number }>) => {
    const e = next.enabled ?? isEnabled;
    const d = next.devices ?? devices;
    const m = next.mode ?? mode;
    const dy = next.days ?? days;
    onChange({
      licenseKeysEnabled: e,
      licenseMaxActivations: d,
      licenseValidityDays: m === 'days' ? dy : null,
    });
  };

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-900">License Keys</h2>
          <p className="mt-1 text-sm text-ink-500">
            Give each buyer a unique license key that activates on a limited number of devices —
            ideal for apps and downloads you want to protect from unrestricted sharing.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          onClick={() => {
            const v = !isEnabled;
            setIsEnabled(v);
            emit({ enabled: v });
          }}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            isEnabled ? 'bg-forest-700' : 'bg-ink-200'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {isEnabled && (
        <div className="mt-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink-700">Devices per license</label>
            <p className="mt-0.5 text-xs text-ink-400">
              How many devices one purchased key may be activated on at once.
            </p>
            <input
              type="number"
              min={1}
              max={100}
              value={devices}
              onChange={(e) => {
                const v = Math.max(1, Math.min(100, parseInt(e.target.value) || 1));
                setDevices(v);
                emit({ devices: v });
              }}
              className="mt-2 w-28 rounded-xl border border-ink-100 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700">Validity</label>
            <div className="mt-2 inline-flex rounded-full border border-ink-100 bg-cream-50 p-1">
              <button
                type="button"
                onClick={() => { setMode('lifetime'); emit({ mode: 'lifetime' }); }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  mode === 'lifetime' ? 'bg-forest-800 text-cream-50' : 'text-ink-600'
                }`}
              >
                Lifetime
              </button>
              <button
                type="button"
                onClick={() => { setMode('days'); emit({ mode: 'days' }); }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  mode === 'days' ? 'bg-forest-800 text-cream-50' : 'text-ink-600'
                }`}
              >
                Time-boxed
              </button>
            </div>
            {mode === 'days' && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => {
                    const v = Math.max(1, parseInt(e.target.value) || 1);
                    setDays(v);
                    emit({ days: v });
                  }}
                  className="w-28 rounded-xl border border-ink-100 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30"
                />
                <span className="text-sm text-ink-500">days from purchase</span>
              </div>
            )}
            <p className="mt-2 text-xs text-ink-400">
              You can change devices, validity, or revoke any issued key later from your Licenses page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
