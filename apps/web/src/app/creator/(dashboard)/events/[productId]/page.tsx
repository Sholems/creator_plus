'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface Attendee {
  id: string;
  ticketCode: string;
  status: 'VALID' | 'CHECKED_IN';
  checkedInAt: string | null;
  createdAt: string;
  buyer?: { displayName: string | null; email: string };
}

export default function EventDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await api.getEventAttendees(token, productId);
      setTitle(data.eventTitle || 'Event');
      setAttendees(Array.isArray(data.tickets) ? data.tickets : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendees');
    } finally {
      setIsLoading(false);
    }
  }, [token, productId]);

  useEffect(() => {
    load();
  }, [load]);

  const doCheckIn = useCallback(
    async (ticketCode: string) => {
      if (!token || !ticketCode.trim()) return;
      setChecking(true);
      setResult(null);
      try {
        const res = await api.checkInTicket(token, productId, ticketCode.trim());
        setResult({
          ok: true,
          text: res.alreadyCheckedIn ? `${res.attendee} was already checked in.` : `✓ ${res.attendee} checked in.`,
        });
        setCode('');
        load();
      } catch (err: any) {
        setResult({ ok: false, text: err.message || 'Check-in failed' });
      } finally {
        setChecking(false);
      }
    },
    [token, productId, load],
  );

  // Camera scanning via the native BarcodeDetector (Android Chrome et al.).
  const stopScan = useCallback(() => {
    setScanning(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopScan(), [stopScan]);

  const startScan = async () => {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      setResult({ ok: false, text: 'Camera scanning is not supported on this browser — type the code instead.' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      const detector = new Detector({ formats: ['qr_code'] });
      let last = '';
      const tick = async () => {
        if (!streamRef.current) return;
        try {
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue && codes[0].rawValue !== last) {
            last = codes[0].rawValue;
            await doCheckIn(codes[0].rawValue);
          }
        } catch {
          /* frame not ready */
        }
        if (streamRef.current) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      setResult({ ok: false, text: 'Could not access the camera.' });
      stopScan();
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Name', 'Email', 'Ticket code', 'Status', 'Checked in at'],
      ...attendees.map((a) => [
        a.buyer?.displayName || '',
        a.buyer?.email || '',
        a.ticketCode,
        a.status,
        a.checkedInAt ? new Date(a.checkedInAt).toISOString() : '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-attendees.csv`;
    a.click();
  };

  const checkedIn = attendees.filter((a) => a.status === 'CHECKED_IN').length;

  return (
    <div>
      <Link href="/creator/events" className="text-sm font-medium text-forest-700 hover:text-forest-600">
        ← All events
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold-600">Event</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900">{title || '…'}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {attendees.length} attendee{attendees.length === 1 ? '' : 's'} · {checkedIn} checked in
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={attendees.length === 0}
          className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-cream-100 disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {error && <div className="mt-5 rounded-xl border border-clay-200 bg-clay-50 p-4 text-sm text-clay-700">{error}</div>}

      {/* Check-in */}
      <div className="surface-card mt-6 p-5">
        <h2 className="font-display text-lg font-semibold text-ink-900">Door check-in</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && doCheckIn(code)}
            placeholder="TKT-XXXX-XXXX"
            className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 font-mono text-sm uppercase text-ink-900 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
          />
          <button
            onClick={() => doCheckIn(code)}
            disabled={checking || !code.trim()}
            className="rounded-xl bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 hover:bg-forest-700 disabled:opacity-50"
          >
            {checking ? 'Checking…' : 'Check in'}
          </button>
          <button
            onClick={() => (scanning ? stopScan() : startScan())}
            className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-cream-100"
          >
            {scanning ? 'Stop camera' : 'Scan QR'}
          </button>
        </div>
        {result && (
          <p className={`mt-3 text-sm font-medium ${result.ok ? 'text-forest-700' : 'text-clay-600'}`}>{result.text}</p>
        )}
        {scanning && (
          <div className="mt-3 overflow-hidden rounded-xl bg-black">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} className="mx-auto max-h-64" playsInline muted />
          </div>
        )}
      </div>

      {/* Attendees */}
      <div className="surface-card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs text-ink-400">
                <th className="px-5 py-3 font-medium">Attendee</th>
                <th className="px-5 py-3 font-medium">Ticket</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {isLoading ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-ink-400">Loading…</td></tr>
              ) : attendees.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-ink-400">No tickets sold yet.</td></tr>
              ) : (
                attendees.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink-900">{a.buyer?.displayName || a.buyer?.email || 'Attendee'}</p>
                      {a.buyer?.displayName && <p className="text-xs text-ink-400">{a.buyer?.email}</p>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-ink-600">{a.ticketCode}</td>
                    <td className="px-5 py-3">
                      {a.status === 'CHECKED_IN' ? (
                        <span className="rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-medium text-forest-700">Checked in</span>
                      ) : (
                        <button
                          onClick={() => doCheckIn(a.ticketCode)}
                          className="rounded-full border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-600 hover:bg-cream-100"
                        >
                          Check in
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
