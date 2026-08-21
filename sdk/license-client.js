/*
 * CreatorPlus License Client — a tiny, dependency-free ES module for gating an
 * offline PWA behind a device-limited license key.
 *
 * Model: one ONLINE activation (enforces the device limit server-side), then the
 * app runs OFFLINE by verifying a signed certificate with an embedded/cached
 * public key. The certificate expires after the platform's grace window
 * (30 days); the client silently renews it whenever the app is online.
 *
 * Usage:
 *   import { LicenseClient } from './license-client.js';
 *   const license = new LicenseClient({
 *     apiBase: 'https://api.mycreatorplus.com/api/v1',
 *     productId: '<your-product-id>',        // optional, binds the cert to this product
 *     appName: 'Momentum',                    // shown as the device name
 *   });
 *   await license.init();
 *   const status = await license.check();     // { active, reason, claims }
 *   if (!status.active) {
 *     // show your "enter license key" screen, then:
 *     await license.activate(userEnteredKey); // throws on invalid key / device limit
 *   }
 */

const LS = {
  cert: 'cp_license_cert',
  device: 'cp_license_device',
  pubkey: 'cp_license_pubkey',
};

// Renew the certificate when it's within this window of expiring (and online).
const RENEW_BEFORE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed certificate');
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
}

function pemToDer(pem) {
  const body = pem.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, '');
  return b64urlToBytes(body.replace(/\+/g, '-').replace(/\//g, '_'));
}

export class LicenseClient {
  constructor({ apiBase, productId = null, appName = 'This app', storage = null } = {}) {
    if (!apiBase) throw new Error('apiBase is required');
    this.apiBase = apiBase.replace(/\/$/, '');
    this.productId = productId;
    this.appName = appName;
    this.storage = storage || window.localStorage;
    this._pubKey = null;
  }

  async init() {
    // Stable per-install device id (see the sharing caveat in the README).
    let deviceId = this.storage.getItem(LS.device);
    if (!deviceId) {
      deviceId = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      this.storage.setItem(LS.device, deviceId);
    }
    this.deviceId = deviceId;
    return this;
  }

  async _publicKey() {
    if (this._pubKey) return this._pubKey;
    let pem = this.storage.getItem(LS.pubkey);
    if (!pem) {
      // Fetch once (online) and cache for offline verification thereafter.
      const res = await fetch(`${this.apiBase}/licenses/public-key`);
      if (!res.ok) throw new Error('Could not load the license public key');
      pem = (await res.json()).publicKey;
      this.storage.setItem(LS.pubkey, pem);
    }
    this._pubKey = await crypto.subtle.importKey(
      'spki',
      pemToDer(pem),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    return this._pubKey;
  }

  async _verify(token) {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return false;
    const key = await this._publicKey();
    const data = new TextEncoder().encode(`${h}.${p}`);
    return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64urlToBytes(s), data);
  }

  /**
   * Returns { active, reason, claims }. Verifies the stored certificate fully
   * offline; if online and the cert is missing/near expiry, it renews first.
   */
  async check() {
    let token = this.storage.getItem(LS.cert);

    // Opportunistically renew when online and the cert is absent or expiring.
    if (navigator.onLine) {
      const needsRenew =
        !token ||
        (() => {
          try { return decodeJwtPayload(token).exp * 1000 - Date.now() < RENEW_BEFORE_MS; }
          catch { return true; }
        })();
      if (needsRenew && token) {
        try { await this._revalidate(decodeJwtPayload(token).key); token = this.storage.getItem(LS.cert); }
        catch { /* stay on the existing cert if the server is unreachable */ }
      }
    }

    if (!token) return { active: false, reason: 'not_activated', claims: null };

    let claims;
    try { claims = decodeJwtPayload(token); } catch { return { active: false, reason: 'invalid', claims: null }; }

    if (!(await this._verify(token))) return { active: false, reason: 'invalid_signature', claims: null };
    if (claims.deviceId !== this.deviceId) return { active: false, reason: 'device_mismatch', claims };
    if (this.productId && claims.productId !== this.productId) return { active: false, reason: 'wrong_product', claims };
    if (claims.exp * 1000 < Date.now()) return { active: false, reason: 'expired', claims };

    return { active: true, reason: 'ok', claims };
  }

  /** Activate a key on this device (online). Throws with a readable message. */
  async activate(key) {
    const res = await fetch(`${this.apiBase}/licenses/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: (key || '').trim().toUpperCase(), deviceId: this.deviceId, deviceName: this.appName }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || 'Activation failed');
    this.storage.setItem(LS.cert, body.certificate);
    return this.check();
  }

  async _revalidate(key) {
    const res = await fetch(`${this.apiBase}/licenses/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, deviceId: this.deviceId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || 'Validation failed');
    this.storage.setItem(LS.cert, body.certificate);
    return body;
  }

  /** Release this device's slot (online) and clear the local certificate. */
  async deactivate() {
    const token = this.storage.getItem(LS.cert);
    const key = token ? decodeJwtPayload(token).key : null;
    if (key) {
      await fetch(`${this.apiBase}/licenses/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, deviceId: this.deviceId }),
      }).catch(() => {});
    }
    this.storage.removeItem(LS.cert);
    return { deactivated: true };
  }
}
