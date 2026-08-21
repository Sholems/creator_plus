import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createPublicKey, sign as cryptoSign } from 'crypto';

/**
 * Signs offline license activation certificates with an ES256 (ECDSA P-256)
 * keypair, and exposes the public key so a client app can verify a certificate
 * fully offline via Web Crypto (crypto.subtle.verify).
 *
 * The private key lives ONLY in LICENSE_SIGNING_PRIVATE_KEY (server env) and
 * never leaves the server. Keys may be provided as raw PEM (with real or "\n"
 * newlines) or base64-encoded PEM (recommended for single-line env stores).
 * When no key is configured the service reports notConfigured — activation
 * endpoints then fail cleanly with 503 instead of crashing the app.
 */
@Injectable()
export class LicenseSigningService {
  private readonly logger = new Logger(LicenseSigningService.name);
  private readonly privateKeyPem: string | null;
  private readonly publicKeyPem: string | null;

  constructor() {
    this.privateKeyPem = LicenseSigningService.loadKey(process.env.LICENSE_SIGNING_PRIVATE_KEY);
    let pub = LicenseSigningService.loadKey(process.env.LICENSE_SIGNING_PUBLIC_KEY);
    // Derive the public key from the private key when only the private is set.
    if (!pub && this.privateKeyPem) {
      try {
        pub = createPublicKey(this.privateKeyPem).export({ type: 'spki', format: 'pem' }).toString();
      } catch (err) {
        this.logger.error(`Could not derive public key: ${(err as Error).message}`);
      }
    }
    this.publicKeyPem = pub;
    if (!this.privateKeyPem) {
      this.logger.warn(
        'License signing key not configured (LICENSE_SIGNING_PRIVATE_KEY). ' +
          'License activation will be unavailable until it is set.',
      );
    }
  }

  private static loadKey(raw?: string): string | null {
    if (!raw) return null;
    const v = raw.trim();
    if (!v) return null;
    if (v.includes('BEGIN')) return v.replace(/\\n/g, '\n');
    try {
      const decoded = Buffer.from(v, 'base64').toString('utf8');
      return decoded.includes('BEGIN') ? decoded : null;
    } catch {
      return null;
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.privateKeyPem);
  }

  getPublicKeyPem(): string {
    if (!this.publicKeyPem) {
      throw new ServiceUnavailableException('Licensing is not configured on this server');
    }
    return this.publicKeyPem;
  }

  private static b64url(input: Buffer | string): string {
    return Buffer.from(input)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Produce a compact ES256 JWS (a JWT) over the claims. `ieee-p1363` yields the
   * raw R||S signature JOSE/Web Crypto expects (not DER), so the browser can
   * verify it directly.
   */
  signCertificate(claims: Record<string, unknown>): string {
    if (!this.privateKeyPem) {
      throw new ServiceUnavailableException('Licensing is not configured on this server');
    }
    const header = LicenseSigningService.b64url(JSON.stringify({ alg: 'ES256', typ: 'JWT' }));
    const payload = LicenseSigningService.b64url(JSON.stringify(claims));
    const signingInput = `${header}.${payload}`;
    const signature = cryptoSign('sha256', Buffer.from(signingInput), {
      key: this.privateKeyPem,
      dsaEncoding: 'ieee-p1363',
    });
    return `${signingInput}.${LicenseSigningService.b64url(signature)}`;
  }
}
