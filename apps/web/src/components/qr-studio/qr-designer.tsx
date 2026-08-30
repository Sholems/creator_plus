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
    margin: 6,
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
  const inputCls = 'h-8 w-9 cursor-pointer rounded border border-ink-200';
  const selCls = 'rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-sm';

  const framed = d.frame !== 'none';
  const caption = framed && d.caption.trim() && (
    <div style={{ background: d.frameColor, color: d.captionTextColor }} className="rounded-lg px-3 py-1.5 text-center text-sm font-bold tracking-wide">
      {d.caption.trim().toUpperCase()}
    </div>
  );

  return (
    <div className="grid gap-5 sm:grid-cols-[260px_1fr]">
      <div className="flex flex-col items-center">
        <div
          className="flex flex-col gap-2 rounded-2xl p-3"
          style={{ background: d.bgColor, border: framed ? `3px solid ${d.frameColor}` : '1px solid #eee' }}
        >
          {framed && d.captionPos === 'top' && caption}
          <div ref={holderRef} />
          {framed && d.captionPos === 'bottom' && caption}
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={exportPng} className="rounded-full bg-forest-800 px-4 py-1.5 text-xs font-semibold text-cream-50 hover:bg-forest-700">Download PNG</button>
          <button type="button" onClick={downloadSvg} className="rounded-full border border-ink-200 px-4 py-1.5 text-xs font-semibold text-ink-700 hover:bg-cream-100">SVG (code only)</button>
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

        <div className="rounded-xl border border-ink-100 bg-cream-50 p-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-600">
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
        </div>

        {contrast < 3.5 && (
          <p className="rounded-lg bg-gold-50 px-3 py-2 text-xs text-gold-800">Low contrast between dots and background may hurt scan reliability — darken the dots or lighten the background.</p>
        )}
        {d.logo && <p className="text-xs text-ink-400">Logo added; error correction stays High. Keep the logo ≤ 40%.</p>}
        {framed && <p className="text-xs text-ink-400">The frame + caption are baked into the PNG (best for posters). Use SVG for the code alone.</p>}
      </div>
    </div>
  );
}
