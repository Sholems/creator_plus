'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Renders a QR image for the given value, generated in the browser. */
export function QrCode({ value, size = 160, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(''));
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (!src) {
    return <div className={className} style={{ width: size, height: size }} aria-hidden />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Ticket QR code" width={size} height={size} className={className} />;
}
