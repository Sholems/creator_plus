import { createHmac, randomBytes } from 'crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateSecret(bytes = 20): string {
  const buf = randomBytes(bytes);
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    result += BASE32_CHARS[parseInt(chunk, 2)];
  }
  return result;
}

function base32Decode(encoded: string): Buffer {
  const clean = encoded.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (const c of clean) {
    const val = BASE32_CHARS.indexOf(c);
    if (val === -1) throw new Error('Invalid base32 character');
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

function generateTotp(secret: string, timeStep = 30, digits = 6): string {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, '0');
}

export function verifyTotp(secret: string, code: string, window = 1): boolean {
  const timeStep = 30;
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  for (let i = -window; i <= window; i++) {
    const offset = counter + i;
    const key = base32Decode(secret);
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(offset));
    const hmac = createHmac('sha1', key).update(buf).digest();
    const idx = hmac[hmac.length - 1] & 0x0f;
    const val =
      ((hmac[idx] & 0x7f) << 24) |
      ((hmac[idx + 1] & 0xff) << 16) |
      ((hmac[idx + 2] & 0xff) << 8) |
      (hmac[idx + 3] & 0xff);
    const expected = String(val % 10 ** 6).padStart(6, '0');
    if (expected === code) return true;
  }
  return false;
}

export function buildOtpAuthUri(secret: string, email: string, issuer = 'CreatorPlus'): string {
  const encoded = encodeURIComponent(issuer);
  const account = encodeURIComponent(email);
  return `otpauth://totp/${encoded}:${account}?secret=${secret}&issuer=${encoded}&algorithm=SHA1&digits=6&period=30`;
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(4);
    const code = bytes.readUInt32BE(0).toString().slice(-8).padStart(8, '0');
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}
