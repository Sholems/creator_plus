'use client';

import { useEffect, useRef, useState } from 'react';

export interface QrDesign {
  moduleStyle: string;
  eyeStyle: string;
  dotsColor: string;
  cornersColor: string;
  bgColor: string;
  gradient: boolean;
  gradientColor: string;
  logo: string | null;
  logoSize: number;
}

export const DEFAULT_QR_DESIGN: QrDesign = {
  moduleStyle: 'square',
  eyeStyle: 'square',
  dotsColor: '#143c2b',
  cornersColor: '#143c2b',
  bgColor: '#ffffff',
  gradient: false,
  gradientColor: '#166534',
  logo: null,
  logoSize: 0.28,
};

const MODULE_STYLES = ['square', 'rounded', 'dots', 'classy', 'extra-rounded'];
const EYE_STYLES = ['square', 'dot', 'extra-rounded'];

function relLum(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.4222 * ch[2];
}
function contrastRatio(a: string, b: string): number {
  const l1 = relLum(a);
  const l2 = relLum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function QrDesigner({
  url,
  value,
  onChange,
  fileName = 'creatorplus-qr',
}: {
  url: string;
  value: QrDesign;
  onChange: (d: QrDesign) => void;
  fileName?: string;
}) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const d = value;
  const set = (patch: Partial<QrDesign>) => onChange({ ...d, ...patch });

  const options = (design: QrDesign) => ({
    width: 280,
    height: 280,
    type: 'canvas' as const,
    data: url || 'https://mycreatorplus.com',
    image: design.logo || undefined,
    margin: 8,
    qrOptions: { errorCorrectionLevel: 'H' as const },
    dotsOptions: design.gradient
      ? { type: design.moduleStyle as any, gradient: { type: 'linear' as const, rotation: 0.79, colorStops: [{ offset: 0, color: design.dotsColor }, { offset: 1, color: design.gradientColor }] } }
      : { type: design.moduleStyle as any, color: design.dotsColor },
    cornersSquareOptions: { type: design.eyeStyle as any, color: design.cornersColor },
    cornersDotOptions: { type: (design.eyeStyle === 'dot' ? 'dot' : 'square') as any, color: design.cornersColor },
    backgroundOptions: { color: design.bgColor },
    imageOptions: { crossOrigin: 'anonymous' as const, margin: 6, imageSize: design.logoSize, hideBackgroundDots: true },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import('qr-code-styling');
      if (cancelled) return;
      const QRCodeStyling = mod.default;
      qrRef.current = new QRCodeStyling(options(d));
      if (holderRef.current) {
        holderRef.current.innerHTML = '';
        qrRef.current.append(holderRef.current);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (qrRef.current && ready) qrRef.current.update(options(d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ready, JSON.stringify(d)]);

  const onLogo = (file: File | null) => {
    if (!file) return set({ logo: null });
    const reader = new FileReader();
    reader.onload = () => set({ logo: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const download = (extension: 'png' | 'svg') => qrRef.current?.download({ name: fileName, extension });

  const contrast = contrastRatio(d.dotsColor, d.bgColor);
  const inputCls = 'h-8 w-9 cursor-pointer rounded border border-ink-200';
  const selCls = 'rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-sm';

  return (
    <div className="grid gap-5 sm:grid-cols-[280px_1fr]">
      <div className="flex flex-col items-center">
        <div ref={holderRef} className="rounded-2xl border border-ink-100 bg-white p-2" />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => download('png')} className="rounded-full bg-forest-800 px-4 py-1.5 text-xs font-semibold text-cream-50 hover:bg-forest-700">Download PNG</button>
          <button type="button" onClick={() => download('svg')} className="rounded-full border border-ink-200 px-4 py-1.5 text-xs font-semibold text-ink-700 hover:bg-cream-100">SVG (print)</button>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">Modules
            <select className={selCls} value={d.moduleStyle} onChange={(e) => set({ moduleStyle: e.target.value })}>
              {MODULE_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">Eyes
            <select className={selCls} value={d.eyeStyle} onChange={(e) => set({ eyeStyle: e.target.value })}>
              {EYE_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-ink-600">
          <label className="flex items-center gap-1.5">Dots<input type="color" className={inputCls} value={d.dotsColor} onChange={(e) => set({ dotsColor: e.target.value })} /></label>
          <label className="flex items-center gap-1.5">Eyes<input type="color" className={inputCls} value={d.cornersColor} onChange={(e) => set({ cornersColor: e.target.value })} /></label>
          <label className="flex items-center gap-1.5">Background<input type="color" className={inputCls} value={d.bgColor} onChange={(e) => set({ bgColor: e.target.value })} /></label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={d.gradient} onChange={(e) => set({ gradient: e.target.checked })} />Gradient</label>
          {d.gradient && <input type="color" className={inputCls} value={d.gradientColor} onChange={(e) => set({ gradientColor: e.target.value })} />}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-600">
          <label className="cursor-pointer rounded-full border border-ink-200 px-3 py-1.5 font-semibold text-ink-700 hover:bg-cream-100">
            {d.logo ? 'Change logo' : 'Add center logo'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0] ?? null)} />
          </label>
          {d.logo && (
            <>
              <button type="button" onClick={() => set({ logo: null })} className="text-clay-600 hover:underline">Remove logo</button>
              <label className="flex items-center gap-1.5">Size
                <input type="range" min={0.15} max={0.4} step={0.01} value={d.logoSize} onChange={(e) => set({ logoSize: Number(e.target.value) })} />
              </label>
            </>
          )}
        </div>

        {contrast < 3.5 && (
          <p className="rounded-lg bg-gold-50 px-3 py-2 text-xs text-gold-800">Low contrast between dots and background may hurt scan reliability — darken the dots or lighten the background.</p>
        )}
        {d.logo && <p className="text-xs text-ink-400">A logo is added; error correction is kept at High so the code still scans. Keep the logo ≤ 40%.</p>}
      </div>
    </div>
  );
}
