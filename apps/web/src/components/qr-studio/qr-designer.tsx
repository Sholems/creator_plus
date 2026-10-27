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
  frame: 'none' | 'card' | 'banner';
  caption: string;
  captionPos: 'top' | 'bottom';
  frameColor: string;
  captionTextColor: string;
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
  frame: 'none',
  caption: 'SCAN ME',
  captionPos: 'bottom',
  frameColor: '#143c2b',
  captionTextColor: '#ffffff',
};

const MODULE_STYLES = ['square', 'rounded', 'dots', 'classy', 'extra-rounded'];
const EYE_STYLES = ['square', 'dot', 'extra-rounded'];
const QR_SIZE = 260;
const QUIET_ZONE = 28;

function relLum(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrastRatio(a: string, b: string): number {
  const l1 = relLum(a);
  const l2 = relLum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
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
    width: QR_SIZE,
    height: QR_SIZE,
    type: 'canvas' as const,
    data: url || 'https://mycreatorplus.com',
    image: design.logo || undefined,
    // Reserve roughly four modules on every side for reliable camera detection.
    margin: QUIET_ZONE,
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
  }, [url, ready, d.moduleStyle, d.eyeStyle, d.dotsColor, d.cornersColor, d.bgColor, d.gradient, d.gradientColor, d.logo, d.logoSize]);

  const onLogo = (file: File | null) => {
    if (!file) return set({ logo: null });
    const reader = new FileReader();
    reader.onload = () => set({ logo: String(reader.result) });
    reader.readAsDataURL(file);
  };

  async function exportPng() {
    const src = holderRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!src) return;
    const scale = 3;
    const pad = d.frame === 'none' ? 0 : 26;
    const capH = d.frame !== 'none' && d.caption.trim() ? 52 : 0;
    const w = QR_SIZE + pad * 2;
    const h = QR_SIZE + pad * 2 + capH;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    ctx.fillStyle = d.bgColor;
    roundRect(ctx, 0, 0, w, h, d.frame === 'none' ? 0 : 20);
    ctx.fill();
    if (d.frame === 'card' || d.frame === 'banner') {
      ctx.strokeStyle = d.frameColor;
      ctx.lineWidth = 4;
      roundRect(ctx, 3, 3, w - 6, h - 6, 17);
      ctx.stroke();
    }
    const qrY = pad + (capH && d.captionPos === 'top' ? capH : 0);
    ctx.drawImage(src, pad, qrY, QR_SIZE, QR_SIZE);
    if (capH) {
      const barY = d.captionPos === 'top' ? 4 : h - capH - 4;
      ctx.fillStyle = d.frameColor;
      roundRect(ctx, 6, barY, w - 12, capH, 14);
      ctx.fill();
      ctx.fillStyle = d.captionTextColor;
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.caption.trim().toUpperCase(), w / 2, barY + capH / 2 + 1);
    }
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${fileName}.png`;
    a.click();
  }

  const downloadSvg = () => qrRef.current?.download({ name: fileName, extension: 'svg' });

  const contrast = contrastRatio(d.dotsColor, d.bgColor);
  const eyeContrast = contrastRatio(d.cornersColor, d.bgColor);
  const gradientContrast = d.gradient ? contrastRatio(d.gradientColor, d.bgColor) : contrast;
  const lowestContrast = Math.min(contrast, eyeContrast, gradientContrast);
  const preflightStatus = lowestContrast < 3.5 || (d.logo && d.logoSize > 0.36)
    ? 'fail'
    : lowestContrast < 4.5 || (d.logo && d.logoSize > 0.3)
      ? 'warning'
      : 'pass';
  const inputCls = 'h-9 w-10 cursor-pointer rounded border border-ink-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500';
  const selCls = 'rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500';

  const framed = d.frame !== 'none';
  const caption = framed && d.caption.trim() && (
    <div style={{ background: d.frameColor, color: d.captionTextColor }} className="rounded-lg px-3 py-1.5 text-center text-sm font-bold tracking-wide">
      {d.caption.trim().toUpperCase()}
    </div>
  );

  return (
    <div className="grid items-start border-y border-ink-200 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <div className="border-b border-ink-200 bg-cream-50/60 p-5 lg:sticky lg:top-20 lg:border-b-0 lg:border-r">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest-700">Live preview</p>
          <p className="mt-1 text-xs text-ink-500">Every change appears here instantly.</p>
        </div>
        <div className="mt-4 flex max-w-full justify-center overflow-x-auto pb-1">
          <div
            className="flex shrink-0 flex-col gap-2 border p-3"
            style={{ background: d.bgColor, border: framed ? `3px solid ${d.frameColor}` : '1px solid #e7e5df' }}
          >
            {framed && d.captionPos === 'top' && caption}
            <div ref={holderRef} />
            {framed && d.captionPos === 'bottom' && caption}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" disabled={!ready} onClick={exportPng} className="whitespace-nowrap rounded-md bg-forest-800 px-3 py-2 text-xs font-semibold text-cream-50 transition hover:bg-forest-700 active:bg-forest-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-forest-700 disabled:opacity-50">Download PNG</button>
          <button type="button" disabled={!ready} onClick={downloadSvg} className="whitespace-nowrap rounded-md border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-cream-100 active:bg-cream-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 disabled:cursor-wait disabled:bg-cream-100 disabled:opacity-50">SVG code</button>
        </div>
        <p className="mt-3 text-center text-[0.6875rem] leading-4 text-ink-400">PNG suits social posts. SVG stays crisp for posters and packaging.</p>
        <div className={`mt-4 border px-3 py-3 text-left ${preflightStatus === 'pass' ? 'border-forest-200 bg-forest-50' : preflightStatus === 'warning' ? 'border-gold-200 bg-gold-50' : 'border-clay-200 bg-clay-50'}`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-700">Scan preflight</p>
            <span className={`text-[0.625rem] font-bold uppercase ${preflightStatus === 'pass' ? 'text-forest-700' : preflightStatus === 'warning' ? 'text-gold-800' : 'text-clay-700'}`}>{preflightStatus}</span>
          </div>
          <ul className="mt-2 space-y-1 text-[0.6875rem] leading-4 text-ink-600">
            <li>Contrast: {lowestContrast.toFixed(1)}:1 {lowestContrast >= 4.5 ? '— strong' : lowestContrast >= 3.5 ? '— usable with care' : '— increase contrast'}</li>
            <li>Quiet zone: four-module safe margin included</li>
            <li>Logo: {!d.logo ? 'none' : d.logoSize <= 0.3 ? 'safe size' : d.logoSize <= 0.36 ? 'large — test carefully' : 'too large'}</li>
            <li>Error correction: High</li>
          </ul>
        </div>
      </div>

      <div className="min-w-0 divide-y divide-ink-200 px-5 text-sm sm:px-7">
        <section className="py-5">
          <p className="text-sm font-semibold text-ink-900">Pattern</p>
          <p className="mt-1 text-xs text-ink-500">Adjust the modules and corner eyes.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-600">Modules
              <select className={selCls} value={d.moduleStyle} onChange={(e) => set({ moduleStyle: e.target.value })}>
                {MODULE_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-600">Corner eyes
              <select className={selCls} value={d.eyeStyle} onChange={(e) => set({ eyeStyle: e.target.value })}>
                {EYE_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="py-5">
          <p className="text-sm font-semibold text-ink-900">Colours</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-600">
            <label className="flex items-center gap-2">Modules<input aria-label="Module colour" type="color" className={inputCls} value={d.dotsColor} onChange={(e) => set({ dotsColor: e.target.value })} /></label>
            <label className="flex items-center gap-2">Eyes<input aria-label="Eye colour" type="color" className={inputCls} value={d.cornersColor} onChange={(e) => set({ cornersColor: e.target.value })} /></label>
            <label className="flex items-center gap-2">Background<input aria-label="Background colour" type="color" className={inputCls} value={d.bgColor} onChange={(e) => set({ bgColor: e.target.value })} /></label>
            <label className="flex items-center gap-2 border-l border-ink-200 pl-4"><input type="checkbox" checked={d.gradient} onChange={(e) => set({ gradient: e.target.checked })} />Use gradient</label>
            {d.gradient && <label className="flex items-center gap-2">End colour<input aria-label="Gradient end colour" type="color" className={inputCls} value={d.gradientColor} onChange={(e) => set({ gradientColor: e.target.value })} /></label>}
          </div>
        </section>

        <section className="py-5">
          <p className="text-sm font-semibold text-ink-900">Logo</p>
          <p className="mt-1 text-xs text-ink-500">Add a simple, high-contrast mark at the centre.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-600">
          <label className="cursor-pointer rounded-md border border-ink-200 px-3 py-2 font-semibold text-ink-700 transition hover:border-ink-400 focus-within:ring-2 focus-within:ring-forest-500">
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
        </section>

        <section className="py-5">
          <p className="text-sm font-semibold text-ink-900">Frame &amp; call to action</p>
          <p className="mt-1 text-xs text-ink-500">Give scanners a clear reason to point their camera.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-600">
            <label className="flex items-center gap-2">Frame
              <select className={selCls} value={d.frame} onChange={(e) => set({ frame: e.target.value as QrDesign['frame'] })}>
                <option value="none">None</option>
                <option value="card">Bordered card</option>
                <option value="banner">“Scan me” banner</option>
              </select>
            </label>
            {framed && (
              <>
                <input className="w-32 rounded-lg border border-ink-200 px-2 py-1.5 text-sm uppercase" value={d.caption} onChange={(e) => set({ caption: e.target.value })} placeholder="SCAN ME" maxLength={24} />
                <select className={selCls} value={d.captionPos} onChange={(e) => set({ captionPos: e.target.value as 'top' | 'bottom' })}>
                  <option value="bottom">Below</option>
                  <option value="top">Above</option>
                </select>
                <label className="flex items-center gap-1.5">Frame<input type="color" className={inputCls} value={d.frameColor} onChange={(e) => set({ frameColor: e.target.value })} /></label>
                <label className="flex items-center gap-1.5">Text<input type="color" className={inputCls} value={d.captionTextColor} onChange={(e) => set({ captionTextColor: e.target.value })} /></label>
              </>
            )}
          </div>
        </section>

        {contrast < 3.5 && (
          <p className="rounded-lg bg-gold-50 px-3 py-2 text-xs text-gold-800">Low contrast between dots and background may hurt scan reliability — darken the dots or lighten the background.</p>
        )}
        {d.logo && <p className="text-xs text-ink-400">Logo added; error correction stays High. Keep the logo ≤ 40%.</p>}
        {framed && <p className="text-xs text-ink-400">The frame + caption are baked into the PNG (best for posters). Use SVG for the code alone.</p>}
      </div>
    </div>
  );
}
