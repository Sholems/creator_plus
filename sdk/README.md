# CreatorPlus License Client

A tiny, dependency-free helper for gating an **offline PWA** behind a
**device-limited license key** sold on CreatorPlus.

## How it works

1. The buyer enters their license key once. The app calls `activate()` **online**
   — the server checks the device limit and returns a **signed certificate**.
2. The app stores that certificate and, on every launch, verifies it **offline**
   using the platform's public key (Web Crypto). No network needed.
3. The certificate is valid for **30 days**. Whenever the app is online it
   silently renews it. If it can't reach the server for longer than 30 days, the
   license goes inactive until it checks in again.

The device limit is enforced at activation time — that's the only reliable point
for an otherwise-offline app.

## Install

Copy `license-client.js` into your app (or host it yourself and load it as a
module). No build step, no dependencies.

```js
import { LicenseClient } from './license-client.js';

const license = new LicenseClient({
  apiBase: 'https://api.mycreatorplus.com/api/v1',
  productId: 'YOUR_PRODUCT_ID',   // optional — binds certs to this product
  appName: 'Momentum',            // shown as the device name in the buyer's dashboard
});

await license.init();
```

## Gate your app

```js
const status = await license.check();      // fully offline after first activation
if (status.active) {
  startApp();
} else {
  showActivationScreen(status.reason);      // 'not_activated' | 'expired' | 'device_mismatch' | ...
}
```

On your activation screen:

```js
try {
  await license.activate(userTypedKey);     // online, throws on invalid key / device limit
  startApp();
} catch (e) {
  showError(e.message);                      // e.g. "already active on the maximum of 2 device(s)"
}
```

Let buyers move to a new device by releasing this one:

```js
await license.deactivate();                  // frees a slot; buyer can also do this from their dashboard
```

## API

| Method | Description |
|---|---|
| `init()` | Loads/creates the stable device id. Call once at startup. |
| `check()` | `{ active, reason, claims }`. Verifies offline; renews when online & near expiry. |
| `activate(key)` | Activates the key on this device (online). Returns the same shape as `check()`. |
| `deactivate()` | Releases this device's slot (online) and clears the local certificate. |

## Recommended pattern

Call `check()` at launch to gate the UI, and again after the app comes back
online (`window.addEventListener('online', ...)`) so the certificate renews in
the background — the buyer never sees it.

## Good to know

- **A "device" is this browser/PWA install.** If the buyer clears site data or
  reinstalls, it looks like a new device and consumes another slot. This stops
  casual sharing (the point) but isn't unbreakable DRM — no client-side scheme
  is. Tell buyers they can free a slot via **Dashboard → Licenses** or your app's
  Deactivate button.
- **Never-online devices can't be licensed.** Activation and the 30-day renewal
  require the server; a device that never connects can't be counted.
- The public key is fetched once (online) and cached, so verification works
  offline afterwards. Nothing secret ever ships in your app.
