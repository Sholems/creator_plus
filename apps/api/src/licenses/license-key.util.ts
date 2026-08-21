import { randomBytes } from 'crypto';

// Crockford base32 alphabet (no I, L, O, U — avoids look-alike confusion).
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * A high-entropy, human-readable license key: four groups of four characters
 * (e.g. 7F3A-9K2B-XR4Q-M8DT) — 80 bits of entropy, so keys can't be guessed
 * or enumerated even without the activation-endpoint rate limit.
 */
export function generateLicenseKey(): string {
  const bytes = randomBytes(20);
  let out = '';
  for (let i = 0; i < 16; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
    if (i % 4 === 3 && i !== 15) out += '-';
  }
  return out;
}
