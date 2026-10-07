'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushToggle() {
  const { token } = useAuth();
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(ok);
    if (ok) {
      navigator.serviceWorker
        .getRegistration('/sw.js')
        .then((reg) => reg?.pushManager.getSubscription())
        .then((sub) => setEnabled(!!sub))
        .catch(() => {});
    }
  }, []);

  async function enable() {
    if (!token) return;
    setBusy(true);
    setMsg('');
    try {
      const { publicKey } = await api.getPushPublicKey(token);
      if (!publicKey) {
        setMsg('Push notifications are not configured on the server yet.');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setMsg('Notification permission was not granted.');
        return;
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
      await api.subscribePush(token, sub.toJSON());
      setEnabled(true);
      setMsg('Push notifications enabled on this device.');
    } catch (e: any) {
      setMsg(e?.message || 'Could not enable push notifications.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!token) return;
    setBusy(true);
    setMsg('');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api.unsubscribePush(token, sub.endpoint).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setEnabled(false);
      setMsg('Push notifications disabled on this device.');
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return <p className="mt-3 text-xs text-ink-400">Push notifications aren’t supported in this browser.</p>;
  }
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={enabled ? disable : enable}
        disabled={busy}
        className="rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-cream-100 disabled:opacity-50"
      >
        {busy ? 'Working…' : enabled ? 'Disable push notifications' : 'Enable push notifications'}
      </button>
      <p className="mt-2 text-xs text-ink-400">{msg || 'Get a browser notification when someone replies to you.'}</p>
    </div>
  );
}
